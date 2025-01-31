import { hasTooltip, Tooltip } from "components/Tooltip";


interface CanvasToolProps {
    onClick: () => void;
    tooltip?: string;
    children: React.ReactNode;
}


export function CanvasTool({ children, tooltip, onClick }: CanvasToolProps) {
    return <button className={`tool ${hasTooltip(tooltip)}`} onClick={onClick}>
        {children}
        {tooltip &&
            <Tooltip>
                {tooltip}
            </Tooltip>
        }
    </button>
}