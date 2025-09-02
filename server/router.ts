import AWS from 'aws-sdk'
import { NextResponse } from 'next/server'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const prefix = (formData.get('prefix') as string | null) || 'uploads/'

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }

    // Read content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Build a safe key
    const ext = path.extname(file.name) || ''
    const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, '') || 'file'
    const fileName = `${Date.now()}_${base}${ext || '.bin'}`
    const key = `${prefix?.endsWith('/') ? prefix : prefix + '/'}${fileName}`

    // Env config
    const endpoint = process.env.S3_ENDPOINT
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
    const bucket = process.env.S3_BUCKET_NAME
    const region = process.env.S3_REGION || 'us-east-1'
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'true').toLowerCase() === 'true'

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json(
        { success: false, message: 'S3 config missing. Please set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME' },
        { status: 500 },
      )
    }

    // Init S3 client (S3-compatible)
    const s3 = new AWS.S3({
      endpoint,
      accessKeyId,
      secretAccessKey,
      s3ForcePathStyle: forcePathStyle,
      signatureVersion: 'v4',
      region,
    })

    const contentType = (file as any).type || 'application/octet-stream'

    const result = await s3
      .upload({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ACL: 'public-read',
        ContentType: contentType,
      })
      .promise()

    // Prefer provider URL; fall back to composing one
    const url = result.Location || `${endpoint.replace(/\/$/, '')}/${forcePathStyle ? `${bucket}/` : ''}${key}`
    return NextResponse.json({ success: true, url, bucket, key })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ success: false, message: err?.message || 'Upload failed' }, { status: 500 })
  }
}
