import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Try it out. Limited runs, read-only tools.",
    features: [
      "5 agent runs / month",
      "Read-only tools only",
      "Basic tracing",
      "1 workspace member",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For operators who need action tools and full tracing.",
    features: [
      "100 agent runs / month",
      "Read-only + action tools",
      "Full tracing & audit",
      "5 workspace members",
      "Custom guardrail policies",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$79",
    period: "/mo",
    description: "For teams with compliance needs. Seats, audit export, SSO.",
    features: [
      "Unlimited agent runs",
      "All tools enabled",
      "Full tracing, audit & export",
      "Unlimited members",
      "Reviewer role (approval-only)",
      "SSO / SAML",
      "SLA & dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Gate monthly agent runs and which tools are enabled. Start free, scale as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col",
                plan.highlighted && "border-primary/50 ring-1 ring-primary/20 shadow-lg shadow-primary/10"
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ variant: plan.highlighted ? "default" : "outline" }),
                    "w-full"
                  )}
                >
                  {plan.cta}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
