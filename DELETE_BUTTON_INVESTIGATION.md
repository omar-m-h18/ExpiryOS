# Technical Investigation: Why the Delete Button Does Not Work

**Date:** September 15, 2026  
**Status:** Investigation Complete (No Code Fix Applied, as instructed)  
**Applies to:** ExpiryOS Frontend (`artifacts/expiry-tracker`), API Client (`lib/api-client-react`), CI/CD Pipeline (`.github/workflows/ci.yml`), and Netlify Production Deployment (`expiryos.netlify.app`).

---

## Executive Summary

When a user clicks the **Delete** button on an item in the ExpiryOS web application:
1. The backend **successfully** deletes the item from the database and returns `HTTP 204 No Content` (an empty response body).
2. The browser immediately displays a red toast notification: **"Failed to delete item"**.
3. The item remains visible in the UI list until the page is manually reloaded.

The failure is caused by an **unhandled JSON parse error on empty HTTP 204 responses in the deployed frontend bundle**, compounded by a **silent deployment bypass in GitHub Actions CI** that prevents bugfixes from reaching the live Netlify site.

---

## Detailed Root Cause Breakdown

### 1. Client-Side Error: `response.json()` on Empty 204 Response

#### The Mechanism:
In `artifacts/expiry-tracker/src/pages/items-list.tsx`:
```tsx
const handleDelete = (id: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  deleteItem.mutate({ id }, {
    onSuccess: () => {
      toast({ title: "Item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() });
    },
    onError: () => {
      toast({ title: "Failed to delete item", variant: "destructive" });
    }
  });
};
```

#### What the Backend Returns:
In `artifacts/api-server/src/routes/items.ts` (lines 98–112):
```ts
router.delete("/items/:id", async (req: Request, res: Response): Promise<void> => {
  const item = await itemsRepository.delete(req.ownerId, params.data.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.sendStatus(204); // Returns HTTP 204 with ZERO response body bytes
});
```

#### What the Live Deployed JavaScript Bundle Does:
The live site (`https://expiryos.netlify.app/`) serves bundle `/assets/index-C2cMtcLG.js`. Inspection of this bundle confirms its fetch wrapper executes:
```javascript
const response = await fetch(...);
if (!response.ok) {
  const err = await response.json().catch(() => ({ error: response.statusText }));
  throw new Error(err.error || `HTTP ${response.status}`);
}
return await response.json(); // <--- CRASHES HERE ON 204 NO CONTENT
```
- A `204 No Content` response body has a length of `0`.
- In standard Web APIs, calling `response.json()` on an empty string throws:
  ```text
  SyntaxError: Unexpected end of JSON input
  ```
- TanStack Query (`useMutation`) catches this thrown exception as a mutation failure and calls `onError`.
- Result:
  - The UI displays **"Failed to delete item"** even though the backend actually deleted the item.
  - `onSuccess` never executes, so `queryClient.invalidateQueries` is never invoked, leaving the deleted item in the React state.

---

### 2. Deployment Desynchronization: Why the Fix in Source is Not Live

A source-level fix already exists in `lib/api-client-react/src/custom-fetch.ts`:
```typescript
export const parseResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 204 || response.status === 205) {
    return undefined as unknown as T;
  }
  const text = await response.text();
  if (text.length === 0) {
    return undefined as unknown as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response body (status ${response.status})`);
  }
};
```

**Why is this fix not working for users?**  
Because it was **never deployed to production**.

#### Evidence from GitHub Actions Run Analysis:
1. In `.github/workflows/ci.yml`, the deployment step is:
   ```yaml
   deploy-netlify:
     needs: typecheck-and-test
     if: github.ref == 'refs/heads/main' && github.event_name == 'push'
     runs-on: ubuntu-latest
     steps:
       ...
       - name: Deploy to Netlify (production)
         uses: nwtgck/actions-netlify@v3
         with:
           publish-dir: artifacts/expiry-tracker/dist/public
           production-deploy: true
           ...
         env:
           NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
           NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
   ```
2. In GitHub Actions run `#34895730638`, step 7 (`Deploy to Netlify (production)`) completed in **only 2 seconds** with status `success`.
3. In `nwtgck/actions-netlify@v3`, when `NETLIFY_AUTH_TOKEN` or `NETLIFY_SITE_ID` are missing from GitHub Repository Secrets:
   ```typescript
   if (!(netlifyAuthToken && siteId)) {
     const errorMessage = 'Netlify credentials not provided, not deployable'
     if (inputs.failsWithoutCredentials()) {
       throw new Error(errorMessage)
     }
     core.info(errorMessage)
     return // Silently exits with code 0!
   }
   ```
4. Because `fails-without-credentials` defaults to `false`, the action logged `"Netlify credentials not provided, not deployable"` and **exited cleanly with code 0**.
5. The GitHub workflow showed a **green checkmark**, hiding the fact that nothing was deployed. The live production site remains pinned to the outdated bundle `index-C2cMtcLG.js` built in August.

---

### 3. Secondary UI Issue: Dialog Dismissal Blocked by `e.preventDefault()`

In `artifacts/expiry-tracker/src/pages/items-list.tsx`:
```tsx
<AlertDialogAction
  onClick={(e) => handleDelete(item.id, e)}
  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
>
  Delete
</AlertDialogAction>
```
- In Radix UI (`@radix-ui/react-alert-dialog`), `<AlertDialogAction>` internally hooks the `click` event to close the dialog.
- Inside `handleDelete`, `e.preventDefault()` is called.
- In Radix UI, calling `event.preventDefault()` inside an Action handler signals Radix **not to close the dialog**.
- Consequently, the user is left with an open confirmation modal even after clicking Delete.

---

### 4. Local Development Environment Caveat

If attempting to test the delete button locally using `vite dev` or `pnpm dev`:
- In `artifacts/expiry-tracker/vite.config.ts`, there is **no proxy configuration** for `/api/*` to route requests to the API server (port 5000).
- Calls to `/api/items/:id` route to Vite's development server (port 3000), which returns `404 Not Found` or `index.html`, causing delete requests to fail locally unless `VITE_API_BASE_URL` is explicitly provided.

---

## Summary of Findings

| Problem Area | Observed Behavior | Root Cause |
| :--- | :--- | :--- |
| **User Experience** | "Failed to delete item" toast, item remains visible in list | `response.json()` throws `SyntaxError` on empty `204 No Content` body |
| **Database State** | Item is actually deleted on server (disappears on F5) | Backend succeeds and returns 204, but frontend crashes parsing the response |
| **Production Deployment** | Live site serves outdated bundle (`index-C2cMtcLG.js`) | GitHub Actions CI silently skips Netlify deployment due to missing secrets |
| **CI/CD Pipeline** | CI step shows green checkmark despite not deploying | `nwtgck/actions-netlify` exits code 0 when secrets are absent |
| **Modal UI** | Delete confirmation dialog does not auto-dismiss | `e.preventDefault()` suppresses Radix UI's dialog close handler |

