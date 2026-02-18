import React from 'react';
import {
    Bold, Italic,
    Heading1, Heading2, Heading3,
    Table, Plus, Trash, List,
    Indent, Outdent, CheckSquare,
    Quote, Type, Image as ImageIcon
} from 'lucide-react';

interface ContextSidebarProps {
    context: string;
    themeStyle: {
        bg: string;
        text: string;
        menuHover: string;
        menuBorder: string;
    };
    onAction: (action: string) => void;
}

export const ContextSidebar: React.FC<ContextSidebarProps> = ({ context, themeStyle, onAction }) => {
    // Normalize context
    const type = context || "Paragraph";

    // Decide what to show based on `type`
    let title = "General";
    let items: { icon: React.ReactNode, label: string, action: string }[] = [];

    const iconSize = 18;

    if (type.includes("Header") || type.includes("ATXHeading")) {
        title = "Header";
        items = [
            { icon: <Heading1 size={iconSize} />, label: "H1", action: "H1" },
            { icon: <Heading2 size={iconSize} />, label: "H2", action: "H2" },
            { icon: <Heading3 size={iconSize} />, label: "H3", action: "H3" },
            { icon: <Type size={iconSize} />, label: "Text", action: "H1" } // Toggle off
        ];
    } else if (type.includes("Table")) {
        title = "Table";
        items = [
            { icon: <Plus size={iconSize} />, label: "Add Row", action: "Add Row" },
            { icon: <Trash size={iconSize} />, label: "Del Row", action: "Del Row" },
        ];
    } else if (type.includes("List")) {
        title = "List";
        items = [
            { icon: <Indent size={iconSize} />, label: "Indent", action: "Indent" },
            { icon: <Outdent size={iconSize} />, label: "Outdent", action: "Unindent" },
            { icon: <CheckSquare size={iconSize} />, label: "Task", action: "Task Checkbox" },
        ];
    } else if (type.includes("Quote")) {
        title = "Quote";
        items = [
            { icon: <Quote size={iconSize} />, label: "Quote", action: "Quote" }
        ];
    } else {
        // Default / Paragraph
        title = "Text";
        items = [
            { icon: <Bold size={iconSize} />, label: "Bold", action: "Bold" },
            { icon: <Italic size={iconSize} />, label: "Italic", action: "Italic" },
            { icon: <List size={iconSize} />, label: "List", action: "Make List" },
            { icon: <Heading1 size={iconSize} />, label: "Header", action: "H1" }, // Reusing H1
            { icon: <Table size={iconSize} />, label: "Table", action: "Add Row" }, // Basic table insert
            { icon: <ImageIcon size={iconSize} />, label: "Image", action: "insert-image" },
        ];
    }

    return (
        <div
            className="w-16 flex flex-col items-center border-r h-full py-4 transition-colors duration-200 gap-4"
            style={{
                backgroundColor: themeStyle.bg,
                color: themeStyle.text,
                borderColor: themeStyle.menuBorder
            }}
        >
            <div className="text-[10px] font-bold uppercase opacity-50 tracking-wider mb-2 rotate-[-90deg] whitespace-nowrap mt-4">
                {title}
            </div>

            <div className="flex flex-col gap-3 w-full items-center">
                {items.map(item => (
                    <button
                        key={item.label}
                        className={`p-2 rounded transition-colors ${themeStyle.menuHover} group relative flex justify-center items-center`}
                        onClick={() => onAction(item.action)}
                        title={item.label}
                    >
                        {item.icon}
                        {/* Tooltip */}
                        <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-auto opacity-20 text-[10px] transform -rotate-90">
                {/* Debug context */}
            </div>
        </div>
    );
};
