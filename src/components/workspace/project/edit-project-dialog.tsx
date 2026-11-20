import { Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import EditProjectForm from "./edit-project-form";
import { ProjectType } from "@/types/api.type";
import { useState } from "react";

const EditProjectDialog = (props: { project?: ProjectType }) => {
  const [isOpen, setIsOpen] = useState(false);

  const onClose = () => {
    setIsOpen(false);
  };
  return (
    <>
      <Dialog modal={true} open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Edit project"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg border-0">
          <EditProjectForm project={props.project} onClose={onClose} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditProjectDialog;
