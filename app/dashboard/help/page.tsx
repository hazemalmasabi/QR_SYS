import HelpCenter from '@/components/help/HelpCenter'

export const metadata = {
    title: 'Help Center - Dashboard',
}

export default function DashboardHelpPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <HelpCenter context="dashboard" />
        </div>
    )
}
