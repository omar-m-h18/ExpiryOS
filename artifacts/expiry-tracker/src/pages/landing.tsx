import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { Loader2, ArrowRight, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertLead } from "@/lib/demo";

const waitlistSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

type WaitlistValues = z.infer<typeof waitlistSchema>;

export function Landing() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<WaitlistValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: WaitlistValues) => {
    setSubmitting(true);
    try {
      await insertLead(values.email);
      toast({ title: "You're on the list!", description: "We'll be in touch soon." });
      form.reset();
    } catch (err) {
      toast({
        title: "Couldn't add your email",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Brand */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-sm">
              E
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">
              ExpiryOS
            </span>
          </div>

          {/* Hero */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-tight">
              Never miss another renewal.
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Track your licenses, subscriptions, documents, and insurance
              policies — ExpiryOS tells you what's active, expiring soon, or
              already expired.
            </p>
          </div>

          {/* Clear demo notice */}
          <div className="mx-auto max-w-md rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-left">
              <span className="font-medium text-foreground">This is a live demo.</span>{" "}
              You get your own private sample data, and it's cleared when you
              close your browser. No signup needed.
            </p>
          </div>

          {/* CTA */}
          <div>
            <Link href="/demo" className="inline-block">
              <Button size="lg" className="gap-2 text-base px-8 py-6">
                Start the demo
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          {/* Waitlist */}
          <div className="mx-auto max-w-md space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Like what you see? Join the early-bird list.
            </p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col sm:flex-row gap-2"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1 text-left">
                      <FormLabel className="sr-only">Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  )}
                  {submitting ? "Joining..." : "Join the list"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        ExpiryOS demo — your data is private to this browser and resets on close.
      </footer>
    </div>
  );
}

export default Landing;
