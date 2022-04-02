import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as studioDom from '../../../studioDom';
import { NodeId } from '../../../types';
import { WithControlledProp } from '../../../utils/types';
import DialogForm from '../../DialogForm';
import { useDom, useDomApi } from '../../DomLoader';
import dataSources from '../../../studioDataSources/client';

export interface ConnectionSelectProps extends WithControlledProp<NodeId | null> {
  dataSource?: string;
}

export function ConnectionSelect({ dataSource, value, onChange }: ConnectionSelectProps) {
  const dom = useDom();

  const app = studioDom.getApp(dom);
  const { connections = [] } = studioDom.getChildNodes(dom, app);

  const filtered = React.useMemo(() => {
    return dataSource
      ? connections.filter((connection) => connection.attributes.dataSource.value === dataSource)
      : connections;
  }, [connections, dataSource]);

  const handleSelectionChange = React.useCallback(
    (event: SelectChangeEvent<string>) => {
      onChange((event.target.value as NodeId) || null);
    },
    [onChange],
  );

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id="select-connection-type">Connection</InputLabel>
      <Select
        size="small"
        fullWidth
        value={value || ''}
        labelId="select-connection-type"
        label="Connection"
        onChange={handleSelectionChange}
      >
        {filtered.map((connection) => (
          <MenuItem key={connection.id} value={connection.id}>
            {connection.name} | {connection.attributes.dataSource.value}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export interface CreateStudioApiDialogProps {
  appId: string;
  open: boolean;
  onClose: () => void;
}

export default function CreateStudioApiDialog({
  appId,
  onClose,
  ...props
}: CreateStudioApiDialogProps) {
  const [connectionId, setConnectionID] = React.useState<NodeId | null>(null);
  const dom = useDom();
  const domApi = useDomApi();
  const navigate = useNavigate();

  return (
    <Dialog {...props} onClose={onClose}>
      <DialogForm
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          const connection =
            connectionId && studioDom.getMaybeNode(dom, connectionId, 'connection');

          if (!connection) {
            throw new Error(`Invariant: Selected non-existing connection "${connectionId}"`);
          }

          const dataSource = dataSources[connection.attributes.dataSource.value];
          if (!dataSource) {
            throw new Error(
              `Invariant: Selected non-existing dataSource "${connection.attributes.dataSource.value}"`,
            );
          }

          const newApiNode = studioDom.createNode(dom, 'api', {
            attributes: {
              query: studioDom.createConst(dataSource.getInitialQueryValue()),
              connectionId: studioDom.createConst(connectionId),
              dataSource: connection.attributes.dataSource,
            },
          });
          const appNode = studioDom.getApp(dom);
          domApi.addNode(newApiNode, appNode, 'apis');
          onClose();
          navigate(`/app/${appId}/editor/apis/${newApiNode.id}`);
        }}
      >
        <DialogTitle>Create a new MUI Studio API</DialogTitle>
        <DialogContent>
          <Typography>Please select a connection for your API</Typography>
          <ConnectionSelect value={connectionId} onChange={setConnectionID} />
        </DialogContent>
        <DialogActions>
          <Button type="submit" disabled={!connectionId}>
            Create
          </Button>
        </DialogActions>
      </DialogForm>
    </Dialog>
  );
}