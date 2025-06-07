import Head from 'next/head'

import { AppLayout } from '@/components/Layout/AppLayout'
import AuthAppProviders from '@/components/Providers/AuthAppProviders'
import { PageWithLayout } from '@/utils/types'
import { RichTextEditor } from '@/components/SimpleNoteEditor/RichTextEditor'

const NotesPage: PageWithLayout<any> = () => {

  return (
    <>
      <Head>
        <title>SimpleText</title>
      </Head>

      <RichTextEditor />
    </>
  )
}

NotesPage.getProviders = (page, pageProps) => {
  return (
    <AuthAppProviders {...pageProps}>
      <AppLayout {...pageProps}>{page}</AppLayout>
    </AuthAppProviders>
  )
}

export default NotesPage
