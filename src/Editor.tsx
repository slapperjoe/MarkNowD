import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import "./Editor.css";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { hybridPlugin, baseDirFacet } from "./hybridPlugin";

// Basic Light Theme
const lightTheme = EditorView.theme({}, { dark: false });

import { syntaxTree } from "@codemirror/language";

export interface EditorRef {
    executeCommand: (cmd: string) => void;
}

interface EditorProps {
    doc: string;
    onChange?: (doc: string) => void;
    onContextChange?: (context: string) => void;
    themeName: string;
    viewMode: 'interactive' | 'raw';
    filePath?: string | null;
    wordWrap: boolean;
}

export const Editor = forwardRef<EditorRef, EditorProps>(({ doc, onChange, onContextChange, themeName, viewMode, filePath, wordWrap }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Expose commands to parent
    useImperativeHandle(ref, () => ({
        executeCommand: (cmd: string) => {
            const view = viewRef.current;
            if (!view) return;

            view.focus();

            switch (cmd) {
                case "Bold":
                    // Basic implementation: wrap selection or insert **text**
                    wrapSelection(view, "**");
                    break;
                case "Italic":
                    wrapSelection(view, "*");
                    break;
                case "H1":
                    toggleHeader(view, 1);
                    break;
                case "H2":
                    toggleHeader(view, 2);
                    break;
                case "H3":
                    toggleHeader(view, 3);
                    break;
                case "Indent":
                    indentMore(view);
                    break;
                case "Unindent":
                    indentLess(view);
                    break;
                case "Task Checkbox":
                    insertTextAtCursor(view, "- [ ] ");
                    break;
                case "Add Row":
                    // Simple append row
                    insertTextAtCursor(view, "\n| Col | Col |");
                    break;
                case "Add Col":
                    // Not implemented deeply for string manipulation
                    insertTextAtCursor(view, " | Col");
                    break;
                default:
                    console.log("Unknown command:", cmd);
            }
        }
    }));

    // Helpers
    const insertTextAtCursor = (view: EditorView, text: string) => {
        const { from, to } = view.state.selection.main;
        view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length }
        });
    };

    const wrapSelection = (view: EditorView, wrapper: string) => {
        const { from, to } = view.state.selection.main;
        const text = view.state.sliceDoc(from, to);
        const newText = `${wrapper}${text}${wrapper}`;
        view.dispatch({
            changes: { from, to, insert: newText },
            selection: { anchor: from + wrapper.length, head: to + wrapper.length }
        });
    };

    const toggleHeader = (view: EditorView, level: number) => {
        const { state, dispatch } = view;
        const line = state.doc.lineAt(state.selection.main.head);
        const lineText = line.text;
        const hash = "#".repeat(level) + " ";

        let shouldAdd = true;
        // Basic check if already header (naive)
        if (lineText.startsWith("#")) {
            // If different level or same, maybe strip? simple: just strip all headers first
            const match = lineText.match(/^(#+ )/);
            if (match) {
                dispatch({
                    changes: { from: line.from, to: line.from + match[0].length, insert: "" }
                });
                shouldAdd = (match[0].trim().length !== level); // If it was H1 and we clicked H1, removing it effectively toggles off. If H1 and we click H2, we remove H1 and add H2.
                if (!shouldAdd) return;
            }
        }

        if (shouldAdd) {
            dispatch({
                changes: { from: line.from, to: line.from, insert: hash }
            });
        }
    };


    // Create a compartment for the theme. 
    // We use useMemo to keep the same instance across renders.
    const themeCompartment = useMemo(() => new Compartment(), []);
    const baseDirCompartment = useMemo(() => new Compartment(), []);
    const pluginCompartment = useMemo(() => new Compartment(), []);
    const lineWrappingCompartment = useMemo(() => new Compartment(), []);

    // Helper to extract directory from file path
    const getBaseDir = (path: string | null | undefined): string => {
        if (!path) return "";
        // Handle both Windows and Unix paths
        const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return lastSep > 0 ? path.substring(0, lastSep) : "";
    };

    // Effect to update the view when the `doc` prop changes externally
    useEffect(() => {
        if (viewRef.current) {
            const currentDoc = viewRef.current.state.doc.toString();
            if (currentDoc !== doc) {
                viewRef.current.dispatch({
                    changes: { from: 0, to: currentDoc.length, insert: doc }
                });
            }
        }
    }, [doc]);

    useEffect(() => {
        if (!editorRef.current) return;

        let initialTheme = oneDark;
        if (themeName === "Light") initialTheme = lightTheme;
        else if (themeName === "Solarized Light") initialTheme = solarizedLight;
        else if (themeName === "Solarized Dark") initialTheme = solarizedDark;

        const startState = EditorState.create({
            doc: doc,
            extensions: [
                keymap.of([...defaultKeymap, ...historyKeymap]),
                history(),
                markdown({ codeLanguages: languages }),
                highlightActiveLine(),
                themeCompartment.of(initialTheme),
                baseDirCompartment.of(baseDirFacet.of(getBaseDir(filePath))),
                pluginCompartment.of(viewMode === 'interactive' ? hybridPlugin : []),
                lineWrappingCompartment.of(wordWrap ? EditorView.lineWrapping : []),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && onChange) {
                        onChange(update.state.doc.toString());
                    }
                    if (update.selectionSet || update.docChanged) {
                        if (onContextChange) {
                            const state = update.state;
                            const pos = state.selection.main.head;
                            const node = syntaxTree(state).resolveInner(pos, -1);
                            onContextChange(node.name);
                        }
                    }
                }),
                EditorView.theme({
                    "&": { height: "100%", fontSize: "16px" },
                    ".cm-scroller": { fontFamily: "inherit" }
                })
            ],
        });

        const view = new EditorView({
            state: startState,
            parent: editorRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, []);

    // Dynamic Theme Update
    useEffect(() => {
        if (viewRef.current) {
            let themeExtension = oneDark; // Default
            if (themeName === "Light") themeExtension = lightTheme;
            else if (themeName === "Solarized Light") themeExtension = solarizedLight;
            else if (themeName === "Solarized Dark") themeExtension = solarizedDark;

            viewRef.current.dispatch({
                effects: themeCompartment.reconfigure(themeExtension)
            });
        }
    }, [themeName, themeCompartment]);

    // Dynamic baseDir update when filePath changes
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.dispatch({
                effects: baseDirCompartment.reconfigure(baseDirFacet.of(getBaseDir(filePath)))
            });
        }
    }, [filePath, baseDirCompartment]);

    // Dynamic Plugin Update based on ViewMode
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.dispatch({
                effects: pluginCompartment.reconfigure(viewMode === 'interactive' ? hybridPlugin : [])
            });
        }
    }, [viewMode, pluginCompartment]);

    // Dynamic Word Wrap Update
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.dispatch({
                effects: lineWrappingCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : [])
            });
        }
    }, [wordWrap, lineWrappingCompartment]);

    const themeClass = `theme-${themeName.toLowerCase().replace(/ /g, '-')}`;

    return <div ref={editorRef} className={`h-full w-full text-left bg-transparent ${themeClass}`} />;
});
