import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <Card className="w-full border-border/60 bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Email verification — coming soon.</p>
      </CardContent>
    </Card>
  );
}
