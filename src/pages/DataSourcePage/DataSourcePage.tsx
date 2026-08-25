import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Trash2, Plus, Database } from 'lucide-react';
import { useDataSources } from '@/datasource';

const DataSourcePage: React.FC = () => {
  const { sources, active, add, remove, select } = useDataSources();
  const [name, setName] = useState('');
  const [appToken, setAppToken] = useState('');
  const [tableId, setTableId] = useState('');

  const handleAdd = () => {
    if (!appToken.trim() || !tableId.trim()) {
      toast.error('请填写多维表格 app_token 和 table_id');
      return;
    }
    add({ name: name.trim() || `数据源 ${sources.length + 1}`, appToken: appToken.trim(), tableId: tableId.trim() });
    toast.success('已添加数据源');
    setName('');
    setAppToken('');
    setTableId('');
  };

  const handleSelect = (item: { appToken: string; tableId: string; name: string }) => {
    select(item);
    toast.success(`已切换到「${item.name}」`);
  };

  return (
    <div className="mx-auto max-w-[900px] p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">数据源设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          配置应用读取的多维表格，可添加多个并切换（测试数据 / 生产数据）
        </p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader className="p-6 pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Database className="h-5 w-5 text-primary" />
            新增数据源
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名称（如：测试库）"
            />
            <Input
              value={appToken}
              onChange={(e) => setAppToken(e.target.value)}
              placeholder="app_token（Base 令牌）"
            />
            <Input
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="table_id（数据表 ID）"
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              添加
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            app_token 在飞书多维表格 URL 里（bitable/apps/<span className="font-mono">这个</span>/tables/...），
            table_id 形如 <span className="font-mono">tblXXXXXXXX</span>。
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">数据源列表</h2>
        {sources.length === 0 ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-6 text-sm text-muted-foreground">
              暂无数据源。添加后选择左侧列表切换；当前默认使用环境变量里的数据源。
            </CardContent>
          </Card>
        ) : (
          sources.map((item) => {
            const isActive = active && active.appToken === item.appToken && active.tableId === item.tableId;
            return (
              <Card
                key={`${item.appToken}-${item.tableId}`}
                className={`rounded-xl shadow-sm ${isActive ? 'border-primary' : ''}`}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    {isActive && <Check className="h-5 w-5 text-primary" />}
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                        {item.appToken} / {item.tableId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <Button variant="outline" size="sm" onClick={() => handleSelect(item)}>
                        切换到当前
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item.appToken, item.tableId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DataSourcePage;
