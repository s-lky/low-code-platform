// types/component.ts
export interface ApiFieldMapping {
    xField: string;  // X 轴映射字段
    yField: string;  // Y 轴映射字段
}

export interface ComponentDataConfig {
    type: 'static' | 'api';
    // 静态数据配置
    staticData: string;  // JSON 字符串
    
    // API 数据配置
    apiUrl?: string;          // API 接口地址
    apiMethod?: 'GET' | 'POST';  // 请求方式
    apiHeaders?: string;      // Headers JSON 字符串
    apiParams?: string;       // 参数 JSON 字符串
    autoUpdate?: boolean;     // 是否自动更新
    interval?: number;        // 自动更新间隔（秒）
    
    // 数据映射
    xField: string;
    yField: string;
}
export interface EditorComponent {
  id: string;
  component: string;
  style: any; // 以后有空了可以把 style 也定义一个具体的 Interface
  dataConfig: ComponentDataConfig;
  propValue: {
    title: string;
  };
}