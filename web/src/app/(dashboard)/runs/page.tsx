"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RunStatus {
  id: string;
  goal: string;
  status: string;
  result?: any;
  step_count: number;
  tool_call_count: number;
  cost_usd: number;
  error_message?: string;
  created_at: string;
}

export default function RunsPage() {
  const { accessToken } = useAuth();
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runData, setRunData] = useState<RunStatus | null>(null);

  const startRun = async () => {
    if (!goal.trim() || !accessToken) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) throw new Error("Failed to start run");
      const data = await res.json();
      setActiveRunId(data.run_id);
      setGoal("");
      toast.success("Run started successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error starting run");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeRunId || !accessToken) return;
    
    // Polling interval
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${activeRunId}`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setRunData(data);
          
          if (["completed", "failed", "aborted"].includes(data.status)) {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRunId, accessToken]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Start, monitor, and replay agent task executions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a New Run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Goal Description</Label>
            <div className="flex gap-2">
              <Input 
                id="goal" 
                placeholder="e.g., Research recent AI models and draft a brief" 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startRun()}
                disabled={submitting}
              />
              <Button onClick={startRun} disabled={submitting || !goal.trim()} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeRunId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Run Status: {runData?.status || "Loading..."}</span>
              <span className="text-xs text-muted-foreground font-mono">{activeRunId}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 border border-border/50 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm text-muted-foreground space-y-2">
              <p className="text-primary">{'>'} Goal: {runData?.goal || "..."}</p>
              <p>{'>'} Status: {runData?.status || "queued"}</p>
              {runData?.status === 'running' && (
                <p className="animate-pulse">{'>'} Agent is thinking and researching...</p>
              )}
              {runData?.status === 'completed' && (
                <>
                  <p className="text-emerald-500">{'>'} Task completed successfully.</p>
                  <p className="mt-4 text-white">Result Draft:</p>
                  <div className="whitespace-pre-wrap text-white/80">{runData.result?.draft}</div>
                </>
              )}
              {runData?.status === 'failed' && (
                <p className="text-red-500">{'>'} Task failed: {runData.error_message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
