/**
 * 组件注册中心 (Registry)
 * 负责管理低代码平台中的所有组件，支持静态注册和动态热插拔。
 */

import type { Component } from 'vue'
import { ref } from 'vue'

export interface ComponentMeta {
    name: string;
    component: Component;
    icon?: string;
    category?: 'chart' | 'text' | 'custom';
    // 用于动态加载的记录
    remoteUrl?: string; 
    loadedAt?: number;
}

class ComponentRegistry {
    private registry: Map<string, ComponentMeta> = new Map()
    
    // 响应式触发器：每次注册/删除时递增，通知 Vue 重新计算
    private version = ref(0)

    // 注册组件
    register(name: string, component: Component, meta?: Partial<ComponentMeta>) {
        this.registry.set(name, {
            name,
            component,
            icon: meta?.icon || '📦',
            category: meta?.category || 'custom',
            remoteUrl: meta?.remoteUrl
        })
        this.version.value++ // 触发 Vue 响应式更新
        console.log(`[Registry] 已注册组件: ${name}`)
    }

    // 获取组件
    get(name: string): Component | undefined {
        return this.registry.get(name)?.component
    }

    // 获取所有已注册的组件列表（用于 UI 渲染）
    list(): ComponentMeta[] {
        return Array.from(this.registry.values())
    }

    // 检查组件是否已注册
    has(name: string): boolean {
        return this.registry.has(name)
    }

    // 获取响应式版本号（用于 Vue computed 依赖追踪）
    getVersion() {
        return this.version
    }

    // 批量注册多个组件（用于初始化）
    registerBatch(components: Array<{name: string; component: Component; meta?: Partial<ComponentMeta>}>) {
        components.forEach(({name, component, meta}) => {
            this.register(name, component, meta)
        })
    }

    // 动态加载远程组件（支持 ESM 和 UMD）
    async loadRemoteComponent(name: string, url: string): Promise<Component> {
        if (this.has(name)) {
            return this.get(name)!
        }

        try {
            // 动态 import 加载 ESM 模块
            const module = await import(/* @vite-ignore */ url)
            
            // 兼容 ESM (default export) 和 UMD (named export)
            const component = module.default || module[name]
            
            if (component) {
                this.register(name, component, { 
                    remoteUrl: url, 
                    loadedAt: Date.now(),
                    category: 'custom' 
                })
                return component
            } else {
                throw new Error(`模块 ${url} 中未找到组件: ${name}`)
            }
        } catch (error) {
            console.error(`[Registry] 动态加载组件 ${name} 失败:`, error)
            throw error
        }
    }

    // 从 localStorage 恢复已注册的自定义组件
    restoreFromStorage() {
        const stored = localStorage.getItem('custom-components')
        if (stored) {
            try {
                const customList = JSON.parse(stored)
                console.log(`[Registry] 恢复 ${customList.length} 个自定义组件`)
                return customList
            } catch {
                return []
            }
        }
        return []
    }

    // 保存自定义组件列表到 localStorage
    saveToStorage(customList: Array<{name: string; url: string}>) {
        localStorage.setItem('custom-components', JSON.stringify(customList))
    }
}

export const registry = new ComponentRegistry()
