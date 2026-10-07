import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateItem,
  useUpdateItem,
  useGetItem,
  useGetItemsSummary,
  getGetItemQueryKey,
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
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Save, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const itemSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  category: z
    .string()
    .max(100, "Category must be at most 100 characters")
    .optional(),
  expiration_date: z.string().min(1, "Expiration date is required").refine(val => {
    return !isNaN(Date.parse(val));
  }, "Invalid date format"),
  notes: z
    .string()
    .max(5000, "Notes must be at most 5,000 characters")
    .optional(),
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

  const { data: item, isLoading: isLoadingItem, isError: isItemError, error: itemError, refetch: refetchItem } = useGetItem(itemId, {
    query: {
      enabled: !isNew && !!itemId,
      queryKey: getGetItemQueryKey(itemId)
    }
  });

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { data: summary, isLoading: isLoadingSummary } = useGetItemsSummary();
  const isAtLimit = isNew && (summary?.total ?? 0) >= 10;

  const isSaving = createItem.isPending || updateItem.isPending;
  const isSubmitDisabled = isSaving || isAtLimit || (isNew && isLoadingSummary);

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
          queryClient.invalidateQueries({ queryKey: ["/api/items"] });
          queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() });
          setLocation("/demo/items");
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to create item";
          toast({ title: msg, variant: "destructive" });
        }
      });
    } else {
      updateItem.mutate({ id: itemId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Item updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetItemQueryKey(itemId) });
          queryClient.invalidateQueries({ queryKey: ["/api/items"] });
          queryClient.invalidateQueries({ queryKey: getGetItemsSummaryQueryKey() });
          setLocation("/demo/items");
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to update item";
          toast({ title: msg, variant: "destructive" });
        }
      });
    }
  };

  if (!isNew && isItemError) {
    const isNotFound = itemError instanceof Error && itemError.message.toLowerCase().includes("not found");
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        <Button
          variant="ghost"
          onClick={() => setLocation("/demo/items")}
          className="pl-0 text-muted-foreground hover:text-foreground text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Items
        </Button>

        <Card className="border border-border/80">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-1">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground">
              {isNotFound ? "Item not found" : "Failed to load item"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {isNotFound
                ? "This item may have been deleted, or it belongs to a different demo session. Head back to your items to pick another."
                : "We couldn't retrieve the details for this item. Please check your connection and try again."}
            </p>
            <div className="flex gap-2 mt-3">
              {!isNotFound && (
                <Button variant="outline" size="sm" onClick={() => refetchItem()}>
                  Retry
                </Button>
              )}
              <Button onClick={() => setLocation("/demo/items")} size="sm">
                Back to Items
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isNew && isLoadingItem) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-28 w-full rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Skeleton className="h-10 w-20 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/demo/items")}
        className="pl-0 text-muted-foreground hover:text-foreground text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Items
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
          {isNew ? "Add New Item" : "Edit Item"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {isNew 
            ? "Track a new expiration date for an item, subscription, or document." 
            : "Update details for this tracked item."}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isAtLimit && (
            <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                You have reached the demo room limit of 10 items. Delete an existing item to create a new one.
              </span>
            </div>
          )}
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
                  render={({ field }) => {
                    const selectedDate = field.value
                      ? new Date(`${field.value}T00:00:00`)
                      : undefined;

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiration Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-10",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {selectedDate && !isNaN(selectedDate.getTime()) ? (
                                  <span className="text-foreground font-medium">{format(selectedDate, "MMM d, yyyy")}</span>
                                ) : (
                                  <span>Select expiration date...</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(format(date, "yyyy-MM-dd"));
                                } else {
                                  field.onChange("");
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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

              <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 border-t gap-2.5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setLocation("/demo/items")}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitDisabled} className="w-full sm:w-auto font-medium shadow-2xs">
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
