import * as React from 'react';
import { Box, Button, Stack, styled, Toolbar, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { NodeId } from '../../../types';
import * as studioDom from '../../../studioDom';
import { useDom, useDomApi } from '../../DomLoader';
import StudioSandbox from '../../StudioSandbox';
import getImportMap from '../../../getImportMap';
import renderThemeCode from '../../../renderThemeCode';
import renderEntryPoint from '../../../renderPageEntryCode';
import { tryFormat } from '../../../utils/prettier';

const ComponentSandbox = styled(StudioSandbox)({
  height: '100%',
});

interface CodeComponentEditorContentProps {
  codeComponentNode: studioDom.StudioCodeComponentNode;
}

function CodeComponentEditorContent({ codeComponentNode }: CodeComponentEditorContentProps) {
  const dom = useDom();
  const domApi = useDomApi();

  const [input, setInput] = React.useState(codeComponentNode.code);

  const updateDomActionRef = React.useRef(() => {});

  React.useEffect(() => {
    updateDomActionRef.current = () => {
      const pretty = tryFormat(input);
      setInput(pretty);
      domApi.setNodeAttribute(codeComponentNode, 'code', pretty);
    };
  }, [domApi, codeComponentNode, input]);

  const editorRef = React.useRef<monacoEditor.editor.IStandaloneCodeEditor>();
  const HandleEditorMount = React.useCallback(
    (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
      editorRef.current = editor;

      editor.updateOptions({
        minimap: { enabled: false },
        accessibilitySupport: 'off',
      });

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
      });

      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });

      // The types for `monaco.KeyCode` seem to be messed up
      // eslint-disable-next-line no-bitwise
      editor.addCommand(monaco.KeyMod.CtrlCmd | (monaco.KeyCode as any).KEY_S, () => {
        updateDomActionRef.current();
      });

      fetch('/typings.json')
        .then((res) => res.json())
        .then((typings) => {
          Array.from(Object.entries(typings)).forEach(([path, content]) => {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              content as string,
              `file:///${path}`,
            );
          });
        })
        .catch((err) =>
          console.error(`Failed to initialize typescript types on editor: ${err.message}`),
        );
    },
    [],
  );

  const themePath = './lib/theme.ts';
  const entryPath = `./entry.tsx`;
  const componentPath = `./components/${codeComponentNode.id}.tsx`;

  const renderedTheme = React.useMemo(() => {
    return renderThemeCode(dom, { editor: true });
  }, [dom]);

  const renderedEntrypoint = React.useMemo(() => {
    return renderEntryPoint({
      pagePath: componentPath,
      themePath,
      editor: true,
    });
  }, [componentPath, themePath]);

  return (
    <Stack sx={{ height: '100%' }}>
      <Toolbar>
        <Button
          disabled={codeComponentNode.code === input}
          onClick={() => updateDomActionRef.current()}
        >
          Update
        </Button>
      </Toolbar>
      <Box flex={1} display="flex">
        <Box flex={1}>
          <Editor
            height="100%"
            value={input}
            onChange={(newValue) => setInput(newValue || '')}
            path="./component.tsx"
            language="typescript"
            onMount={HandleEditorMount}
          />
        </Box>
        <Box flex={1}>
          <ComponentSandbox
            base={`/components/${codeComponentNode.id}/`}
            importMap={getImportMap()}
            files={{
              [componentPath]: { code: input },
              [themePath]: { code: renderedTheme.code },
              [entryPath]: { code: renderedEntrypoint.code },
            }}
            entry={entryPath}
          />
        </Box>
      </Box>
    </Stack>
  );
}

interface CodeComponentEditorProps {
  className?: string;
}

export default function CodeComponentEditor({ className }: CodeComponentEditorProps) {
  const dom = useDom();
  const { nodeId } = useParams();
  const codeComponentNode = studioDom.getNode2(dom, nodeId as NodeId, 'codeComponent');
  return (
    <Box className={className}>
      {codeComponentNode ? (
        <CodeComponentEditorContent key={nodeId} codeComponentNode={codeComponentNode} />
      ) : (
        <Typography sx={{ p: 4 }}>Non-existing Code Component &quot;{nodeId}&quot;</Typography>
      )}
    </Box>
  );
}