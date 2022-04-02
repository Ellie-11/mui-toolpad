import { IncomingMessage } from 'http';

// Represents what a session is able to do within Toolpad
export interface Capabilities {
  // View and use Toolpad Applications
  view: boolean;
  // Create and edit Toolpad Applications
  edit: boolean;
}

export const CAP_VIEWER: Capabilities = {
  view: true,
  edit: false,
};

export const CAP_EDITOR: Capabilities = {
  view: true,
  edit: true,
};

export async function getCapabilities(req: IncomingMessage): Promise<Capabilities | null> {
  return CAP_VIEWER;
}