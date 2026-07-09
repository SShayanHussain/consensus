import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container mx-auto max-w-7xl px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="px-4 py-1.5 text-xs font-mono border-primary/30 text-primary">
              Multi-Agent Ops • Human-in-the-Loop
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Agents that do the work.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                You approve what matters.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Consensus runs a team of AI agents that research, analyze, and draft real work using
              your tools — with a full audit trail and a human-approval gate before anything
              consequential happens.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full shadow-lg shadow-primary/25 px-8 text-base hover:scale-105 transition-all"
                )}
              >
                Start Free
              </Link>
              <Link
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full px-8 text-base"
                )}
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Approval Gate Preview */}
      <section id="how-it-works" className="py-20 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              The approval gate is the product
            </h2>
            <p className="text-muted-foreground text-lg">
              Before any consequential action, execution pauses. You see exactly what the agent
              wants to do, with full context. Approve, edit, or reject.
            </p>
          </div>

          {/* Live flow visualization */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-mono font-bold text-sm">01</span>
                </div>
                <h3 className="font-semibold">Set a Goal</h3>
                <p className="text-sm text-muted-foreground">
                  &quot;Prepare a competitive brief on Company X&apos;s latest product launch.&quot;
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-mono font-bold text-sm">02</span>
                </div>
                <h3 className="font-semibold">Agents Execute</h3>
                <p className="text-sm text-muted-foreground">
                  Researcher, analyst, and writer collaborate — every step traced and auditable.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-primary/40 bg-card p-6 space-y-3 ring-1 ring-primary/20">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-mono font-bold text-sm">03</span>
                </div>
                <h3 className="font-semibold text-primary">You Approve</h3>
                <p className="text-sm text-muted-foreground">
                  Before sending the brief, the gate fires. Full context. Your call.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Multi-Agent Orchestration",
                desc: "Supervisor routes to specialist agents (researcher, analyst, writer) via LangGraph.",
                icon: "⚡",
              },
              {
                title: "Full Tracing & Audit",
                desc: "Every node, tool call, token, and decision — traced and auditable. Vendor-independent.",
                icon: "📊",
              },
              {
                title: "Human-in-the-Loop",
                desc: "Consequential actions pause for approval. Runs survive restarts while waiting.",
                icon: "🛡️",
              },
              {
                title: "Tools via MCP",
                desc: "Standard tool integration. Read-only runs freely; anything that changes state is gated.",
                icon: "🔌",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border/60 bg-card/50 p-6 space-y-3 hover:border-border transition-colors">
                <span className="text-2xl">{feature.icon}</span>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 md:px-8 text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to take control?</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Deploy agents with confidence. Every action observable. Every decision yours.
          </p>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full shadow-lg shadow-primary/25 px-8 text-base hover:scale-105 transition-all"
            )}
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
