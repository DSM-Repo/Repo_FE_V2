'use client'

import type { SVGProps, ReactNode } from 'react'
import { useState } from 'react'

import { Button, Checkbox, CheckboxOption, Input, Logo, Switch } from '@/shared/ui'

import styles from './ComponentPreview.module.css'

export function ComponentPreview() {
  const [interactiveCheckboxChecked, setInteractiveCheckboxChecked] = useState(false)
  const [interactiveOptionChecked, setInteractiveOptionChecked] = useState(false)
  const [interactiveSwitchChecked, setInteractiveSwitchChecked] = useState(false)

  return (
    <main className={styles.preview}>
      <section aria-labelledby="button-preview-title" className={styles.section}>
        <h1 className={styles.sectionTitle} id="button-preview-title">
          Button
        </h1>

        <div className={styles.buttonFrameWrap}>
          <div className={styles.stateLabels} aria-hidden="true">
            <p className={styles.stateLabel}>기본</p>
            <p className={styles.stateLabel}>호버</p>
            <p className={styles.stateLabel}>비활성</p>
          </div>

          <div>
            <div className={styles.buttonFrame}>
              <div className={styles.buttonGrid}>
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
        </div>
      </section>

      <section aria-labelledby="checkbox-preview-title" className={styles.section}>
        <h1 className={styles.sectionTitle} id="checkbox-preview-title">
          Checkbox
        </h1>

        <div className={styles.checkboxFrame}>
          <div className={styles.checkboxGroup}>
            <p className={styles.previewLabel}>Primitive</p>
            <Checkbox checked={false} onCheckedChange={() => undefined} aria-label="unchecked checkbox" />
            <Checkbox checked onCheckedChange={() => undefined} aria-label="checked checkbox" />
            <label className={styles.inlineControl}>
              <Checkbox
                checked={interactiveCheckboxChecked}
                onCheckedChange={setInteractiveCheckboxChecked}
                aria-label="interactive checkbox"
              />
              <span>{interactiveCheckboxChecked ? 'checked' : 'unchecked'}</span>
            </label>
            <Checkbox checked={false} disabled onCheckedChange={() => undefined} aria-label="disabled unchecked checkbox" />
            <Checkbox checked disabled onCheckedChange={() => undefined} aria-label="disabled checked checkbox" />
          </div>

          <div className={styles.checkboxGroup}>
            <p className={styles.previewLabel}>Checkbox Option</p>
            <CheckboxOption checked={false} onCheckedChange={() => undefined}>
              선택지
            </CheckboxOption>
            <CheckboxOption checked onCheckedChange={() => undefined}>
              선택지
            </CheckboxOption>
            <CheckboxOption checked={interactiveOptionChecked} onCheckedChange={setInteractiveOptionChecked}>
              클릭 가능한 선택지
            </CheckboxOption>
            <CheckboxOption checked={false} disabled onCheckedChange={() => undefined}>
              비활성 선택지
            </CheckboxOption>
            <CheckboxOption checked disabled onCheckedChange={() => undefined}>
              비활성 선택지
            </CheckboxOption>
          </div>
        </div>
      </section>

      <section aria-labelledby="switch-preview-title" className={styles.section}>
        <h1 className={styles.sectionTitle} id="switch-preview-title">
          Switch
        </h1>

        <div className={styles.switchFrame}>
          <Switch checked={false} onCheckedChange={() => undefined} aria-label="off 상태 스위치" />
          <Switch checked onCheckedChange={() => undefined} aria-label="on 상태 스위치" />
          <div className={styles.switchInteractiveRow}>
            <Switch
              checked={interactiveSwitchChecked}
              onCheckedChange={setInteractiveSwitchChecked}
              aria-label="클릭 가능한 스위치"
            />
            <span className={styles.switchStateText}>{interactiveSwitchChecked ? 'on' : 'off'}</span>
          </div>
          <Switch checked={false} disabled onCheckedChange={() => undefined} aria-label="disabled off 상태 스위치" />
          <Switch checked disabled onCheckedChange={() => undefined} aria-label="disabled on 상태 스위치" />
        </div>
      </section>

      <section aria-labelledby="logo-preview-title" className={styles.section}>
        <h1 className={styles.sectionTitle} id="logo-preview-title">
          Logo
        </h1>

        <div className={styles.logoFrame}>
          <Logo />
          <Logo tone="dark" />
        </div>
      </section>

      <section aria-labelledby="input-preview-title" className={styles.section}>
        <h1 className={styles.sectionTitle} id="input-preview-title">
          Input
        </h1>

        <div className={styles.inputFrame}>
          <Input placeholder="내용을 입력해주세요." rightIcon={<EyeIcon />} />
          <Input placeholder="내용을 입력해주세요." />
          <Input
            error
            errorMessage="에러메시지를 띄워줍니다."
            placeholder="내용을 입력해주세요."
            rightIcon={<EyeIcon />}
          />
          <Input error errorMessage="에러메시지를 띄워줍니다." placeholder="내용을 입력해주세요." />
          <Input error placeholder="내용을 입력해주세요." />
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

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M2.5 12C4.7 7.8 8 5.7 12 5.7C16 5.7 19.3 7.8 21.5 12C19.3 16.2 16 18.3 12 18.3C8 18.3 4.7 16.2 2.5 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.7C13.4912 14.7 14.7 13.4912 14.7 12C14.7 10.5088 13.4912 9.3 12 9.3C10.5088 9.3 9.3 10.5088 9.3 12C9.3 13.4912 10.5088 14.7 12 14.7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}
