/// <reference types="vite/client" />
import type { FFrameApi } from "../electron/preload";

declare global {
  interface Window {
    fframe: FFrameApi;
  }
}
