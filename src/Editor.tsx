import { useEffect, useRef, useMemo } from "react";
import "./Editor.css";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { hybridPlugin } from "./hybridPlugin";

// Basic Light Theme
const lightTheme = EditorView.theme({}, { dark: false });

interface EditorProps {
    doc: string;
    onChange?: (doc: string) => void;
    themeName: string;
}

export const Editor = ({ doc, onChange, themeName }: EditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Create a compartment for the theme. 
    // We use useMemo to keep the same instance across renders.
    const themeCompartment = useMemo(() => new Compartment(), []);

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
                hybridPlugin,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && onChange) {
                        onChange(update.state.doc.toString());
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

    return <div ref={editorRef} className="h-full w-full text-left bg-transparent" />;
};
