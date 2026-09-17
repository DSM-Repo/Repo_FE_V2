import Image from 'next/image'
import Link from 'next/link'

import { LandingMotion } from './LandingMotion'
import styles from './page.module.css'

export default function HomePage() {
  const feedbackItems = Array.from({ length: 8 }, (_, index) => index)
  const stripItems = Array.from({ length: 9 }, (_, index) => index)

  return (
    <main className={styles.landingPage} data-landing-root>
      <LandingMotion />
      <section className={styles.hero} aria-labelledby="home-title">
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Repo 홈">
            <Image className={styles.brandIcon} src="/assets/landing/repo-logo.svg" alt="" width={24} height={24} />
            <span className={styles.brandText}>Repo</span>
          </Link>
          <Link className={styles.loginPill} href="/login">
            로그인
          </Link>
        </header>

        <Image className={styles.wordmark} src="/assets/landing/repo-wordmark.svg" alt="" width={855} height={284} priority style={{ height: 'auto' }} />

        <div className={styles.heroCopy}>
          <div className={styles.badge}>
            <span className={styles.badgeStrong}>New</span>
            <span>Repo</span>
          </div>
          <h1 className={styles.heroTitle} id="home-title">
            <span className={styles.heroTitleLine}>
              <span className={styles.accent}>이력서</span>,
            </span>
            <span className={styles.heroTitleLine}>온라인으로</span>
            <span className={styles.heroTitleLine}>쉽고 간편하게</span>
          </h1>
          <div className={styles.heroActions}>
            <Link className={styles.buttonSecondary} href="/login">
              로그인
            </Link>
            <Link className={styles.button} href="/signup">
              Repo 사용하기
              <Image className={styles.buttonIcon} src="/assets/landing/arrow-right.svg" alt="" width={24} height={24} />
            </Link>
          </div>
        </div>

        <Image
          className={styles.heroMedia}
          src="/assets/landing/hero-laptop.png"
          alt="Repo 이력서 관리 화면이 열린 노트북"
          width={808}
          height={812}
          priority
          style={{ height: 'auto' }}
        />
        <Image className={styles.downCue} src="/assets/landing/chevron-down.svg" alt="" width={48} height={48} />
      </section>

      <section className={styles.statement} aria-labelledby="landing-statement-title">
        <div className={styles.statementIntro} data-landing-motion="statement">
          <h2 className={styles.quote} id="landing-statement-title">
            “ 나만의 이력서가 기업에 닿는 순간 ”
          </h2>
          <p className={styles.subtitle}>대덕소프트웨어 학생들을 위한 디지털레주메 플랫폼 Repo</p>
        </div>
        <div className={styles.lineStatement} aria-label="Repo에서 할 수 있는 일">
          <div className={styles.lineRow} data-landing-motion="line">
            <span className={styles.lineRowText}>언제든,</span>
          </div>
          <div className={styles.lineRow} data-landing-motion="line">
            <span className={styles.lineRowText}>자유롭게,</span>
          </div>
          <div className={styles.lineRow} data-landing-motion="line">
            <span className={styles.lineRowText}>작성하고 기록하며,</span>
          </div>
          <div className={styles.lineRow} data-landing-motion="line">
            <span className={styles.lineRowText}>자신을 어필하세요.</span>
          </div>
        </div>
      </section>

      <div className={styles.timeline} aria-hidden="true" data-landing-motion="timeline">
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDiamond} />
      </div>

      <section className={styles.feature} aria-labelledby="resume-feature-title">
        <div className={styles.resumeVisual} aria-hidden="true" data-landing-motion="resume-media">
          <span className={styles.orbSoft} />
          <Image className={`${styles.sheet} ${styles.sheetBack}`} src="/assets/landing/project-sheet.png" alt="" width={494} height={700} style={{ height: 'auto' }} />
          <Image className={`${styles.sheet} ${styles.sheetFront}`} src="/assets/landing/resume-sheet.png" alt="" width={494} height={700} style={{ height: 'auto' }} />
        </div>
        <div className={styles.featureText} data-landing-motion="copy">
          <span className={styles.badge}>
            <span className={styles.badgeStrong}>이력서</span>
          </span>
          <h2 className={styles.featureTitle} id="resume-feature-title">
            쉽게 작성하는 나만의 이력서
          </h2>
          <span className={styles.featureDivider} />
          <p className={styles.featureBody}>
            <span>마크다운으로 쉽게,</span>
            <span>자기소개부터 프로젝트까지.</span>
            <span>실시간으로 이력서를 확인하며 쉽게 작성하세요.</span>
          </p>
          <Link className={`${styles.button} ${styles.featureCta}`} href="/login">
            이력서 작성하러 가기
            <Image className={styles.buttonIcon} src="/assets/landing/arrow-right.svg" alt="" width={24} height={24} />
          </Link>
        </div>
      </section>

      <div className={`${styles.timeline} ${styles.timelineAlt}`} aria-hidden="true" data-landing-motion="timeline">
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDiamond} />
      </div>

      <section className={`${styles.feature} ${styles.featureReverse}`} aria-labelledby="library-feature-title">
        <div className={styles.featureText} data-landing-motion="copy">
          <span className={styles.badge}>
            <span className={styles.badgeStrong}>도서관</span>
          </span>
          <h2 className={styles.featureTitle} id="library-feature-title">
            <span className={styles.featureTitleStacked}>언제든 열람 가능한</span>
            이력서 도서관
          </h2>
          <span className={styles.featureDivider} />
          <p className={styles.featureBody}>
            <span>어디든지, 어디서든지.</span>
            <span>언제나 확인할 수 있는 윗 기수 선배님들의 이력서</span>
            <span>다양한 이력서를 확인하며 나의 이력서를 꾸며보세요.</span>
          </p>
          <Link className={`${styles.button} ${styles.featureCta}`} href="/library">
            도서관 열람하기
            <Image className={styles.buttonIcon} src="/assets/landing/arrow-right.svg" alt="" width={24} height={24} />
          </Link>
        </div>
        <div className={styles.libraryPanel} aria-hidden="true" data-landing-motion="panel">
          <Image className={styles.libraryImage} src="/assets/landing/library-grid.png" alt="" width={667} height={523} data-landing-motion="library-image" style={{ height: 'auto' }} />
        </div>
      </section>

      <div className={`${styles.timeline} ${styles.timelineAlt}`} aria-hidden="true" data-landing-motion="timeline">
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDot} />
        <span className={styles.timelineLine} />
        <span className={styles.timelineDiamond} />
      </div>

      <section className={styles.feature} aria-labelledby="feedback-feature-title">
        <div className={styles.feedbackPanel} data-landing-motion="panel">
          <div className={styles.feedbackHeader}>
            <h2 className={styles.feedbackTitle}>피드백 목록</h2>
            <span aria-hidden="true">×</span>
          </div>
          <div className={styles.feedbackBody}>
            <span className={styles.selectHint}>선택하기</span>
            {feedbackItems.map((item) => (
              <div className={`${styles.feedbackItem} ${item === 1 ? styles.feedbackItemOpen : ''}`} key={item}>
                <div className={styles.feedbackMeta}>
                  <span>피드백 제목</span>
                  <span className={styles.feedbackTime}>1일 전</span>
                </div>
                {item === 1 ? <span className={styles.feedbackDetail}>피드백에 대한 상세 내용</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.featureText} data-landing-motion="copy">
          <span className={styles.badge}>
            <span className={styles.badgeStrong}>피드백</span>
          </span>
          <h2 className={styles.featureTitle} id="feedback-feature-title">
            선생님의 1:1 피드백
          </h2>
          <span className={styles.featureDivider} />
          <p className={styles.featureBody}>
            <span>선생님도 쉽게, 학생도 쉽게</span>
            <span>피드백을 보고 수정하는 과정으로</span>
            <span>나의 이력서를 더 완벽하게 만들어보세요.</span>
          </p>
          <Link className={`${styles.button} ${styles.featureCta}`} href="/login">
            피드백 확인하기
            <Image className={styles.buttonIcon} src="/assets/landing/arrow-right.svg" alt="" width={24} height={24} />
          </Link>
        </div>
      </section>

      <section className={styles.whySection} aria-label="Repo 사용 이유">
        <span className={styles.orbStrong} aria-hidden="true" />
        <p className={styles.toast} data-landing-motion="pop">그래서 왜 Repo를 사용해야 하나요?</p>
        <div className={styles.reasonCards} aria-hidden="true">
          <div className={styles.reasonCard} data-landing-motion="card" />
          <div className={styles.reasonCard} data-landing-motion="card" />
          <div className={styles.reasonCard} data-landing-motion="card" />
        </div>
      </section>

      <section className={styles.ctaSection} aria-labelledby="landing-cta-title">
        <div className={styles.sectionRule} data-landing-motion="timeline">
          <h2 className={styles.sectionRuleText}>지금 Repo를 사용하고,</h2>
        </div>
        <div className={styles.ctaWords}>
          <p className={`${styles.ctaGradient} ${styles.ctaGradientTop}`} data-landing-motion="gradient-top">언제든 기록하세요</p>
          <h2 className={styles.ctaMain} id="landing-cta-title" data-landing-motion="cta-main">
            나만의 이력서를 만드세요
          </h2>
          <p className={`${styles.ctaGradient} ${styles.ctaGradientBottom}`} data-landing-motion="gradient-bottom">자신을 어필하세요.</p>
          <div className={styles.finalCta} data-landing-motion="pop">
            <Link className={styles.button} href="/signup">
              Repo 사용하기
              <Image className={styles.buttonIcon} src="/assets/landing/arrow-right.svg" alt="" width={24} height={24} />
            </Link>
          </div>
        </div>
        <div className={styles.resumeStrip} aria-hidden="true" data-landing-motion="strip">
          {stripItems.map((item) => (
            <Image className={styles.stripImage} src="/assets/landing/resume-sheet.png" alt="" width={200} height={283} key={item} />
          ))}
        </div>
        <footer className={styles.footer}>
          <div className={styles.footerTop}>
            <span className={styles.footerBrand}>
              <Image src="/assets/landing/repo-logo.svg" alt="" width={24} height={24} />
              Repo
            </span>
            <nav className={styles.footerLinks} aria-label="약관">
              <Link href="/terms">이용약관</Link>
              <span className={styles.footerDivider} aria-hidden="true" />
              <Link href="/privacy">개인정보처리방침</Link>
            </nav>
          </div>
          <div className={styles.footerBottom}>
            <address className={styles.address}>
              주소 : 대전광역시 유성구 가정북로 76 (장동 23-9)
              <br />
              교무실 : 042-866-8822 | Fax : 042-867-9900 | 행정실 : 042-866-8885 | Fax : 042-863-4308
            </address>
            <span className={styles.copyright}>©2026 REPO</span>
          </div>
        </footer>
      </section>
    </main>
  )
}
