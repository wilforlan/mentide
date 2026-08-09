import type { IpcMain } from "electron";
import { format } from "date-fns";
import {
  getDb,
  getMindwtrMigrationAvailability,
  runMindwtrMigrationFromUi,
} from "../db/database";
import { createGraphRepository } from "../db/repositories/graph";
import { createHistoryRepository } from "../db/repositories/history";
import { createItemRepository } from "../db/repositories/items";
import { createNodeRepository } from "../db/repositories/nodes";
import { createNoteRepository } from "../db/repositories/notes";
import { createPinRepository } from "../db/repositories/pins";
import { createProfileRepository } from "../db/repositories/profiles";

const todayDate = (): string => format(new Date(), "yyyy-MM-dd");

export const registerIpcHandlers = (ipcMain: IpcMain): void => {
  ipcMain.handle("profiles:list", () => {
    return createProfileRepository(getDb()).listActive();
  });

  ipcMain.handle("profiles:listArchived", () => {
    return createProfileRepository(getDb()).listArchived();
  });

  ipcMain.handle("profiles:create", (_event, name: string) => {
    return createProfileRepository(getDb()).create(name);
  });

  ipcMain.handle("profiles:softDelete", (_event, id: string) => {
    return createProfileRepository(getDb()).softDelete(id);
  });

  ipcMain.handle("profiles:restore", (_event, id: string) => {
    return createProfileRepository(getDb()).restore(id);
  });

  ipcMain.handle("notes:getToday", (_event, profileId: string) => {
    return createNoteRepository(getDb()).getOrCreateDaily(
      profileId,
      todayDate()
    );
  });

  ipcMain.handle(
    "notes:getByDate",
    (_event, profileId: string, date: string) => {
      return createNoteRepository(getDb()).getOrCreateDaily(profileId, date);
    }
  );

  ipcMain.handle("notes:listFreeform", (_event, profileId: string) => {
    return createNoteRepository(getDb()).listFreeform(profileId);
  });

  ipcMain.handle(
    "notes:listRecent",
    (_event, profileId: string, limit?: number) => {
      return createNoteRepository(getDb()).listRecent(profileId, limit ?? 20);
    }
  );

  ipcMain.handle("notes:getById", (_event, id: string) => {
    return createNoteRepository(getDb()).getById(id);
  });

  ipcMain.handle(
    "notes:createFreeform",
    (_event, profileId: string, title: string) => {
      return createNoteRepository(getDb()).createFreeform(profileId, title);
    }
  );

  ipcMain.handle(
    "notes:updateContent",
    (_event, id: string, contentJson: string) => {
      return createNoteRepository(getDb()).updateContent(id, contentJson);
    }
  );

  ipcMain.handle("notes:softDelete", (_event, id: string) => {
    return createNoteRepository(getDb()).softDelete(id);
  });

  ipcMain.handle("notes:restore", (_event, id: string) => {
    return createNoteRepository(getDb()).restore(id);
  });

  ipcMain.handle("notes:listArchived", (_event, profileId: string) => {
    return createNoteRepository(getDb()).listArchived(profileId);
  });

  ipcMain.handle(
    "nodes:createFromWikiLink",
    (
      _event,
      options: { profileId: string; sourceNoteId: string; title: string }
    ) => {
      return createNodeRepository(getDb()).createFromWikiLink(options);
    }
  );

  ipcMain.handle("nodes:promote", (_event, nodeId: string) => {
    return createNodeRepository(getDb()).promote(nodeId);
  });

  ipcMain.handle("nodes:getById", (_event, id: string) => {
    return createNodeRepository(getDb()).getById(id);
  });

  ipcMain.handle(
    "nodes:getHub",
    (
      _event,
      options: { profileId: string; title?: string; nodeId?: string }
    ) => {
      return createItemRepository(getDb()).getHub(options);
    }
  );

  ipcMain.handle(
    "nodes:search",
    (
      _event,
      options: { profileId: string; query: string; limit?: number }
    ) => {
      return createNodeRepository(getDb()).search(options);
    }
  );

  ipcMain.handle("graph:get", (_event, profileId: string) => {
    return createGraphRepository(getDb()).get(profileId);
  });

  ipcMain.handle("history:listVersions", (_event, noteId: string) => {
    return createHistoryRepository(getDb()).listVersions(noteId);
  });

  ipcMain.handle("history:saveVersion", (_event, noteId: string) => {
    return createHistoryRepository(getDb()).saveVersion(noteId);
  });

  ipcMain.handle("history:restoreVersion", (_event, versionId: string) => {
    return createHistoryRepository(getDb()).restoreVersion(versionId);
  });

  ipcMain.handle("pins:list", (_event, profileId: string) => {
    return createPinRepository(getDb()).list(profileId);
  });

  ipcMain.handle(
    "pins:add",
    (_event, options: { profileId: string; nodeId: string }) => {
      return createPinRepository(getDb()).add(options);
    }
  );

  ipcMain.handle(
    "pins:remove",
    (_event, options: { profileId: string; nodeId: string }) => {
      createPinRepository(getDb()).remove(options);
    }
  );

  ipcMain.handle(
    "pins:isPinned",
    (_event, options: { profileId: string; nodeId: string }) => {
      return createPinRepository(getDb()).isPinned(options);
    }
  );

  ipcMain.handle("migration:getStatus", () => {
    return getMindwtrMigrationAvailability();
  });

  ipcMain.handle("migration:run", () => {
    return runMindwtrMigrationFromUi();
  });
};
