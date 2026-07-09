import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools (MCP)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connected tool servers. Manage read-only vs. consequential classification and approval policies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-12 font-mono">
            No tools configured yet. MCP tool servers will appear here once connected.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
