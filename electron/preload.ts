import { contextBridge, ipcRenderer } from "electron";
import type { MentideApi } from "../shared/types";

const api: MentideApi = {
  profiles: {
    list: () => ipcRenderer.invoke("profiles:list"),
    listArchived: () => ipcRenderer.invoke("profiles:listArchived"),
    create: (name) => ipcRenderer.invoke("profiles:create", name),
    softDelete: (id) => ipcRenderer.invoke("profiles:softDelete", id),
    restore: (id) => ipcRenderer.invoke("profiles:restore", id),
  },
  notes: {
    getToday: (profileId) => ipcRenderer.invoke("notes:getToday", profileId),
    getByDate: (profileId, date) =>
      ipcRenderer.invoke("notes:getByDate", profileId, date),
    listFreeform: (profileId) =>
      ipcRenderer.invoke("notes:listFreeform", profileId),
    getById: (id) => ipcRenderer.invoke("notes:getById", id),
    createFreeform: (profileId, title) =>
      ipcRenderer.invoke("notes:createFreeform", profileId, title),
    updateContent: (id, contentJson) =>
      ipcRenderer.invoke("notes:updateContent", id, contentJson),
    softDelete: (id) => ipcRenderer.invoke("notes:softDelete", id),
    restore: (id) => ipcRenderer.invoke("notes:restore", id),
    listArchived: (profileId) =>
      ipcRenderer.invoke("notes:listArchived", profileId),
  },
  nodes: {
    createFromWikiLink: (options) =>
      ipcRenderer.invoke("nodes:createFromWikiLink", options),
    promote: (nodeId) => ipcRenderer.invoke("nodes:promote", nodeId),
    getById: (id) => ipcRenderer.invoke("nodes:getById", id),
    getHub: (options) => ipcRenderer.invoke("nodes:getHub", options),
    search: (options) => ipcRenderer.invoke("nodes:search", options),
  },
  graph: {
    get: (profileId) => ipcRenderer.invoke("graph:get", profileId),
  },
  history: {
    listVersions: (noteId) => ipcRenderer.invoke("history:listVersions", noteId),
    saveVersion: (noteId) => ipcRenderer.invoke("history:saveVersion", noteId),
    restoreVersion: (versionId) =>
      ipcRenderer.invoke("history:restoreVersion", versionId),
  },
};

contextBridge.exposeInMainWorld("mentide", api);
