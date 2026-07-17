import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateItem,
  useUpdateItem,
  useGetItem,
  getGetItemQueryKey,
  getListItemsQueryKey,
  getGetItemsSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const itemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  expiration_date: z.string().min(1, "Expiration date is required").refine(val => {
    return !isNaN(Date.parse(val));
  }, "Invalid date format"),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export function ItemForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  
  // Guard against route params on /new (params.id might be missing or literal "new" depending on setup, wouter named routes usually handle this, but to be safe:)
  const isNew = !params.id || params.id === "new";
  const itemId = isNew ? "" : params.id!;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: item, isLoading: isLoadingItem } = useGetItem(itemId, {
    query: {
      enabled: !isNew && !!itemId,
      queryKey: getGetItemQueryKey(itemId)
    }
  });

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const isSaving = createItem.isPending || updateItem.isPending;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: "",
      category: "",
      expiration_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (item && !isNew) {
      form.reset({
        title: item.title,
        category: item.category || "",
        // Form needs YYYY-MM-DD
        expiration_date: item.expiration_date,
        notes: item.notes || "",
      });
    }
  }, [item, isNew, form]);

  const onSubmit = (data: ItemFormValues) => {
    // Transform empty strings to undefined/null to match API expectations if needed
    const payload = {
      title: data.title,
      category: data.category || undefined,
      expiration_date: data.expiration_date,
      notes: data.notes || undefined,
    };

    if (isNew) {
      createItem.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Item created successfully" });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() });
          setLocation("/items");
        },
        onError: () => {
          toast({ title: "Failed to create item", variant: "destructive" });
        }
      });
    } else {
      updateItem.mutate({ id: itemId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Item updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetItemQueryKey(itemId) });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() });
          setLocation("/items");
        },
        onError: () => {
          toast({ title: "Failed to update item", variant: "destructive" });
        }
      });
    }
  };

  if (!isNew && isLoadingItem) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/items")}
        className="pl-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Items
      </Button>

      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          {isNew ? "Add New Item" : "Edit Item"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isNew 
            ? "Track a new expiration date for an item, subscription, or document." 
            : "Update details for this tracked item."}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Passport, Domain Name, Spotify..." {...field} />
                    </FormControl>
                    <FormDescription>What item are you tracking?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="expiration_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        {/* Use a native date input for simplicity and best mobile support */}
                        <Input type="date" {...field} className="block" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Documents, Software, Health..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any extra details, account numbers, or links here..." 
                        className="resize-none min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row justify-end pt-4 border-t gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setLocation("/items")}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isNew ? "Create Item" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
