import { useEffect, useState } from "react";
import { Node, Edge } from "reactflow";
import { WorkflowCanvas } from "@/components/creative/WorkflowCanvas";
import { useLocation } from "react-router-dom";

const Creative = () => {
  const location = useLocation();
  const [loadWorkflowData, setLoadWorkflowData] = useState<{nodes: Node[], edges: Edge[], workflowId?: string, workflowName?: string} | null>(null);

  const [clearCache, setClearCache] = useState(false);

  // Ler dados do state quando vem de /creative/salvos
  useEffect(() => {
    const state = location.state as { loadWorkflow?: {nodes: Node[], edges: Edge[], workflowId?: string, workflowName?: string}, newWorkflow?: boolean };
    if (state?.newWorkflow) {
      setClearCache(true);
      setLoadWorkflowData(null);
      window.history.replaceState({}, document.title);
    } else if (state?.loadWorkflow) {
      setClearCache(false);
      setLoadWorkflowData(state.loadWorkflow);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="h-[calc(100vh-72px)] mt-[72px] overflow-hidden">
        <WorkflowCanvas loadWorkflowData={loadWorkflowData} clearCache={clearCache} />
      </div>
    </div>
  );
};

export default Creative;
