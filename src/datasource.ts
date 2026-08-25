import { useCallback, useEffect, useState } from 'react';

export interface DataSourceItem {
  name: string;
  appToken: string;
  tableId: string;
}

const LS_KEY = 'kuakua_data_sources';
const COOKIE = 'kuakua_ds';

function readList(): DataSourceItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeActiveCookie(ds: DataSourceItem | null) {
  if (!ds) {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0`;
    return;
  }
  document.cookie = `${COOKIE}=${encodeURIComponent(
    JSON.stringify({ appToken: ds.appToken, tableId: ds.tableId }),
  )}; Path=/; Max-Age=31536000`;
}

export function useDataSources() {
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [active, setActive] = useState<DataSourceItem | null>(null);

  useEffect(() => {
    const list = readList();
    setSources(list);
    // 若有 cookie 中的激活项，且存在于列表，就作为当前
    const current = list.find((d) => document.cookie.includes(COOKIE));
    setActive(current || list[0] || null);
  }, []);

  const save = useCallback((next: DataSourceItem[]) => {
    setSources(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setActive((prev) => next.find((d) => prev && d.appToken === prev.appToken && d.tableId === prev.tableId) || next[0] || null);
  }, []);

  const saveLocal = useCallback((next: DataSourceItem[]) => {
    setSources(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback((item: DataSourceItem) => {
    const list = readList();
    const next = [...list.filter((d) => !(d.appToken === item.appToken && d.tableId === item.tableId)), item];
    saveLocal(next);
    setSources(next);
  }, [saveLocal]);

  const remove = useCallback((appToken: string, tableId: string) => {
    const list = readList().filter((d) => !(d.appToken === appToken && d.tableId === tableId));
    saveLocal(list);
    setSources(list);
    setActive((prev) => {
      if (prev && prev.appToken === appToken && prev.tableId === tableId) {
        const next = list[0] || null;
        writeActiveCookie(next);
        return next;
      }
      return prev;
    });
  }, [saveLocal]);

  const select = useCallback((item: DataSourceItem) => {
    writeActiveCookie(item);
    setActive(item);
  }, []);

  return { sources, active, add, remove, select };
}
