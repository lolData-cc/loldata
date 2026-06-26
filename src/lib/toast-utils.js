import { jsx as _jsx } from "react/jsx-runtime";
import { toast } from "sonner";
import { CyberToast } from "@/components/ui/cyber-toast";
export function showCyberToast({ title, description, tag, variant = "status", duration = 3000, action, closeButton = false, id, }) {
    toast.custom((toastId) => (_jsx(CyberToast, { title: title, description: description, tag: tag, variant: variant, action: action ? {
            label: action.label,
            onClick: () => { action.onClick(); toast.dismiss(toastId); },
        } : undefined, onDismiss: closeButton ? () => toast.dismiss(toastId) : undefined })), { duration, ...(id !== undefined && { id }) });
}
