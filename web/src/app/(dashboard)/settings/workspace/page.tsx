import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsWorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your team, billing, and global guardrail policies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Workspace settings — coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
