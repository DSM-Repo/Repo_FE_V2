import type { ReactNode } from 'react'

import { Button } from '@/shared/ui'

import styles from './ComponentPreview.module.css'

export function ComponentPreview() {
  return (
    <main className={styles.preview}>
      <h1 className={styles.sectionTitle}>Button</h1>

      <section className={styles.frameWrap} aria-labelledby="button-preview-title">
        <div className={styles.stateLabels} aria-hidden="true">
          <p className={styles.stateLabel}>기본</p>
          <p className={styles.stateLabel}>호버</p>
          <p className={styles.stateLabel}>비활성</p>
        </div>

        <div>
          <div className={styles.frame}>
            <div className={styles.grid}>
              <PreviewColumn title="Filled">
                <Button>버튼</Button>
                <Button data-preview-state="hover">버튼</Button>
                <Button disabled>버튼</Button>
              </PreviewColumn>

              <PreviewColumn title="Bordered dark">
                <Button variant="bordered-dark">버튼</Button>
                <Button data-preview-state="hover" variant="bordered-dark">
                  버튼
                </Button>
                <Button disabled variant="bordered-dark">
                  버튼
                </Button>
              </PreviewColumn>

              <PreviewColumn title="Filled icon">
                <Button iconRight="plus">버튼</Button>
                <Button data-preview-state="hover" iconRight="plus">
                  버튼
                </Button>
                <Button disabled iconRight="plus">
                  버튼
                </Button>
              </PreviewColumn>

              <PreviewColumn title="Bordered dark icon">
                <Button iconRight="right-arrow" variant="bordered-dark">
                  버튼
                </Button>
                <Button data-preview-state="hover" iconRight="right-arrow" variant="bordered-dark">
                  버튼
                </Button>
                <Button disabled iconRight="right-arrow" variant="bordered-dark">
                  버튼
                </Button>
              </PreviewColumn>
            </div>
          </div>

          <div className={styles.groupLabels}>
            <span>아이콘 off</span>
            <span>아이콘 on</span>
          </div>
        </div>
      </section>
    </main>
  )
}

type PreviewColumnProps = {
  children: ReactNode
  title: string
}

function PreviewColumn({ children, title }: PreviewColumnProps) {
  return (
    <div className={styles.column}>
      <h2 className={styles.columnTitle}>{title}</h2>
      <div className={styles.buttonStack}>{children}</div>
    </div>
  )
}
