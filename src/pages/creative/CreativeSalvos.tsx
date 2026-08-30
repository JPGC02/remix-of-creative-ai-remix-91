import { WorkflowFileBrowser } from "@/components/creative/WorkflowFileBrowser";

const CreativeSalvos = () => {
  return (
    <div className="fixed inset-0 top-[72px] overflow-auto bg-zinc-950 px-4 py-6">
      <WorkflowFileBrowser />
    </div>
  );
};

export default CreativeSalvos;
