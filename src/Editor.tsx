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
    insertText: (text: string) => void;
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
        insertText: (text: string) => {
            const view = viewRef.current;
            if (!view) return;
            view.focus();
            insertTextAtCursor(view, text);
        },
        executeCommand: (cmd: string) => {
            const view = viewRef.current;
            if (!view) return;

            view.focus();

            switch (cmd) {
                case "Bold":
                    // Smart implementation
                    smartToggle(view, "**");
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
                case "Make List":
                    toggleList(view);
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

    // Smart Bold / Selection Wrapper
    // If selection -> wrap
    // If empty -> check word -> wrap word
    // If empty & no word -> wrap line
    const smartToggle = (view: EditorView, wrapper: string) => {
        const { state, dispatch } = view;
        const { from, empty } = state.selection.main;

        if (!empty) {
            // Standard wrap
            wrapSelection(view, wrapper);
            return;
        }

        const line = state.doc.lineAt(from);
        const lineText = line.text;

        // Check if cursor is inside a word (alphanumeric check approx)
        // We can use the wordAt logic or regex.
        // Simple regex approach: capture word at pos
        const relativePos = from - line.from;

        // Find word boundaries around relativePos
        // We look back until space/boundary and forward until space/boundary
        let start = relativePos;
        let end = relativePos;

        // Naive word boundary detection
        while (start > 0 && /\S/.test(lineText[start - 1])) {
            start--;
        }
        while (end < lineText.length && /\S/.test(lineText[end])) {
            end++;
        }

        const word = lineText.slice(start, end);

        // Criteria for "being in a word": non-empty and at least one char is not just punctuation if we want to be strict, but \S includes punctuation.
        // User asked: "If we are on a space area in a line ... entire line is being bolded"
        // "if we are inside a word ... only that word is being bolded"

        // If cursor was at a space, start === end (approx, or logic above stopped immediately).
        if (start === end) {
            // Space area -> Bold Line
            // Wrap entire line
            const text = lineText;
            const newText = `${wrapper}${text}${wrapper}`;
            dispatch({
                changes: { from: line.from, to: line.to, insert: newText }
            });
        } else {
            // Inside word -> Bold Word
            const newText = `${wrapper}${word}${wrapper}`;
            dispatch({
                changes: { from: line.from + start, to: line.from + end, insert: newText }
            });
        }
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

    const toggleList = (view: EditorView) => {
        const { state, dispatch } = view;
        const line = state.doc.lineAt(state.selection.main.head);
        const lineText = line.text;

        // Check if already a list
        if (lineText.trim().startsWith("- ")) {
            // Remove it
            const match = lineText.match(/^(\s*-\s)/);
            if (match) {
                dispatch({
                    changes: { from: line.from, to: line.from + match[0].length, insert: "" },
                    selection: { anchor: line.from }
                });
            }
        } else {
            // Add it - cursor goes after the "- "
            const prefix = "- ";
            dispatch({
                changes: { from: line.from, to: line.from, insert: prefix },
                selection: { anchor: line.from + prefix.length }
            });
        }
    };

    const toggleHeader = (view: EditorView, level: number) => {
        const { state, dispatch } = view;
        const line = state.doc.lineAt(state.selection.main.head);
        const lineText = line.text;
        const hash = "#".repeat(level) + " ";

        // Check if already a header
        if (lineText.startsWith("#")) {
            const match = lineText.match(/^(#+ )/);
            if (match) {
                // Remove existing header
                dispatch({
                    changes: { from: line.from, to: line.from + match[0].length, insert: "" },
                    selection: { anchor: line.from }
                });
                // If same level, just toggle off (return)
                if (match[0].trim().length === level) return;
                // Otherwise, add new header level below
            }
        }

        // Add header - cursor goes after the "# "
        dispatch({
            changes: { from: line.from, to: line.from, insert: hash },
            selection: { anchor: line.from + hash.length }
        });
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
