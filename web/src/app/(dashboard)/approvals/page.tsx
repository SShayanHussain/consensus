"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

interface ApprovalItem {
  id: string;
  run_id: string;
  proposed_action: {
    tool_name: string;
    tool_server: string;
    arguments: Record<string, any>;
    reason: string;
  };
  context?: any;
  status: string;
  created_at: string;
}

export default function ApprovalsPage() {
  const { accessToken } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/approvals", {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.error("Failed to fetch approvals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchApprovals();
    // Poll for new approvals every 5 seconds
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleDecision = async (id: string, status: "approved" | "rejected") => {
    if (!accessToken) return;
    setDecidingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}/decide`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status, note: "" }),
      });
      if (!res.ok) throw new Error(`Failed to ${status}`);
      
      toast.success(`Action ${status} successfully`);
      // Optimistic remove
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error submitting decision");
    } finally {
      setDecidingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          Approvals
          <Badge variant="outline" className="text-xs font-mono">
            {approvals.length} pending
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Runs paused awaiting your decision. Approve, edit, or reject proposed actions.
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-12 font-mono">
              No pending approvals. Consequential actions from agent runs will appear here.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {approvals.map((approval) => (
            <Card key={approval.id} className="border-primary/20">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-primary font-mono text-xs">[{approval.proposed_action.tool_server}]</span>
                      {approval.proposed_action.tool_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-mono text-xs">Run: {approval.run_id}</p>
                  </div>
                  <Badge variant="secondary">Pending Review</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Agent Reason:</h4>
                  <p className="text-sm bg-accent/50 p-3 rounded-md italic">
                    &quot;{approval.proposed_action.reason}&quot;
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Arguments (Payload):</h4>
                  <pre className="text-xs bg-black/50 p-3 rounded-md font-mono text-emerald-400 overflow-x-auto">
                    {JSON.stringify(approval.proposed_action.arguments, null, 2)}
                  </pre>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t border-border/40 pt-4 bg-muted/20">
                <Button 
                  variant="outline" 
                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/20"
                  onClick={() => handleDecision(approval.id, "rejected")}
                  disabled={decidingId !== null}
                >
                  {decidingId === approval.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                  Reject Action
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleDecision(approval.id, "approved")}
                  disabled={decidingId !== null}
                >
                  {decidingId === approval.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve & Execute
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
