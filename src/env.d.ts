import type { MentideApi } from "@shared/types";

declare global {
  interface Window {
    mentide: MentideApi;
  }
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

export {};
