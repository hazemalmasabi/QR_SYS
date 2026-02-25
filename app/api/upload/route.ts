import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json(
                { success: false, message: 'unauthorized' },
                { status: 401 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'noFile' },
                { status: 400 }
            )
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: 'invalidFileType' },
                { status: 400 }
            )
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, message: 'fileTooLarge' },
                { status: 400 }
            )
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${session.hotelId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        // Convert to buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from('service-images')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json(
                { success: false, message: 'uploadError' },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('service-images')
            .getPublicUrl(fileName)

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
        })
    } catch (error) {
        console.error('Upload API error:', error)
        return NextResponse.json(
            { success: false, message: 'internalError' },
            { status: 500 }
        )
    }
}
