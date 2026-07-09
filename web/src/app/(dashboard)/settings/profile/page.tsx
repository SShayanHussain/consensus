import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Profile, workspace, team, and guardrail configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Profile settings — coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
