import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsModal } from './SettingsModal'

vi.mock('../../../core/context/RemoteAuthContext', () => ({
    useRemoteAuth: () => ({
        user: null,
        isConfigured: true,
        signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resetPrompt: vi.fn(),
    }),
}))

vi.mock('../../../core/context/RemoteSyncContext', () => ({
    useRemoteSync: () => ({
        status: 'idle',
        lastSyncedAt: null,
        lastError: null,
        remoteStudyAggregate: null,
        syncNow: vi.fn().mockResolvedValue(undefined),
    }),
}))

describe('SettingsModal', () => {
    let mockConsoleError: any

    beforeEach(() => {
        mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        // Setup modal root
        const root = document.createElement('div')
        root.id = 'modal-root'
        document.body.appendChild(root)
    })

    afterEach(() => {
        mockConsoleError.mockRestore()
        document.body.innerHTML = ''
    })

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        disableAutoShift: false,
        onDisableAutoShiftChange: vi.fn(),
        backgroundUrl: '',
        onBackgroundUrlChange: vi.fn(),
        dimLevel: 50,
        onDimLevelChange: vi.fn(),
        glassIntensity: 50,
        onGlassIntensityChange: vi.fn(),
        glassRefraction: 50,
        onGlassRefractionChange: vi.fn(),
        onAccentChange: vi.fn(),
    }

    it('displays error message when export fails', async () => {
        // Mock URL.createObjectURL to throw an error, which happens during handleExport
        // Since jsdom doesn't implement URL.createObjectURL, we mock it on global
        const originalCreateObjectURL = global.URL.createObjectURL;
        global.URL.createObjectURL = vi.fn().mockImplementation(() => {
            throw new Error('Mocked export error')
        })

        render(<SettingsModal {...defaultProps} />)

        // Find and click the Export button
        const exportButton = screen.getByRole('button', { name: /export/i })
        fireEvent.click(exportButton)

        // The error message "Failed to export data." should be rendered
        await waitFor(() => {
            expect(screen.getByText('Failed to export data.')).toBeInTheDocument()
        })

        // Assert that the catch block logged the error
        expect(mockConsoleError).toHaveBeenCalledWith('Export failed:', expect.any(Error))

        // Restore
        global.URL.createObjectURL = originalCreateObjectURL;
        vi.restoreAllMocks()
    })
})
