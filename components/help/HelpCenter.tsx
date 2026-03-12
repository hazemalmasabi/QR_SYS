'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Info, ShieldCheck, LayoutGrid, Settings, HelpCircle, BookOpen, UserPlus, LogIn, Key, ClipboardList, ShoppingBag, Box, Grid, Users, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpCenterProps {
    context: 'dashboard' | 'landing'
}

export default function HelpCenter({ context }: HelpCenterProps) {
    const t = useTranslations('help')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')

    const categories = [
        { id: 'all', label: t('categories.all'), icon: LayoutGrid },
        { id: 'general', label: t('categories.general'), icon: Info, sections: ['philosophy', 'registration'] },
        { id: 'auth', label: t('categories.auth'), icon: ShieldCheck, sections: ['login', 'forgotPassword'] },
        { id: 'dashboard', label: t('categories.dashboard'), icon: BookOpen, sections: ['orders', 'services', 'items', 'rooms', 'employees', 'reports'] },
        { id: 'settings', label: t('categories.settings'), icon: Settings, sections: ['settings'] },
    ]

    const sectionIcons: Record<string, any> = {
        philosophy: BookOpen,
        registration: UserPlus,
        login: LogIn,
        forgotPassword: Key,
        orders: ClipboardList,
        services: ShoppingBag,
        items: Box,
        rooms: Grid,
        employees: Users,
        reports: BarChart3,
        settings: Settings,
    }

    const allSections = [
        { id: 'philosophy', category: 'general' },
        { id: 'registration', category: 'general' },
        { id: 'login', category: 'auth' },
        { id: 'forgotPassword', category: 'auth' },
        { id: 'orders', category: 'dashboard' },
        { id: 'services', category: 'dashboard' },
        { id: 'items', category: 'dashboard' },
        { id: 'rooms', category: 'dashboard' },
        { id: 'employees', category: 'dashboard' },
        { id: 'reports', category: 'dashboard' },
        { id: 'settings', category: 'settings' },
    ]

    const filteredSections = allSections.filter(section => {
        const matchesCategory = activeCategory === 'all' || section.category === activeCategory
        const title = t(`sections.${section.id}.title`).toLowerCase()
        const content = t(`sections.${section.id}.content`).toLowerCase()
        const matchesSearch = title.includes(searchQuery.toLowerCase()) || content.includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    return (
        <div className={cn("mx-auto space-y-8", context === 'landing' ? "max-w-5xl py-12 px-4" : "max-w-full")}>
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{t('title')}</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('subtitle')}</p>

                {/* Search Bar */}
                <div className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            activeCategory === cat.id
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20 scale-105"
                                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                        )}
                    >
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Help Content */}
            <div className="grid gap-6">
                {filteredSections.length > 0 ? (
                    filteredSections.map((section) => {
                        const Icon = sectionIcons[section.id] || HelpCircle
                        return (
                            <div
                                key={section.id}
                                className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex flex-col md:flex-row items-start gap-4">
                                    <div className="flex-shrink-0 p-3 bg-primary-50 rounded-xl group-hover:bg-primary-100 transition-colors">
                                        <Icon className="h-6 w-6 text-primary-600" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                                            {t(`sections.${section.id}.title`)}
                                        </h3>
                                        <div className="text-gray-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                                            {t(`sections.${section.id}.content`)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">{t('noResultsFound')}</h3>
                        <p className="text-gray-500">{t('searchNoResults')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
