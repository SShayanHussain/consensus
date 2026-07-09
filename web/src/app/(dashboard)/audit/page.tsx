import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable record of every action taken across all runs. Vendor-independent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-12 font-mono">
            No audit entries yet. Every agent action, tool call, and approval decision will be logged here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
