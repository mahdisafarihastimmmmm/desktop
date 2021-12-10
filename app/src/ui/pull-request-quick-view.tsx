import * as React from 'react'
import { clamp } from '../lib/clamp'
import { PullRequest } from '../models/pull-request'
import { PullRequestBadge } from './branches'
import { Dispatcher } from './dispatcher'
import { Button } from './lib/button'
import { SandboxedMarkdown } from './lib/sandboxed-markdown'
import { Octicon } from './octicons'
import * as OcticonSymbol from './octicons/octicons.generated'

/**
 * The max height of the visible quick view card is 556 (500 for scrollable
 * body and 56 for header)
 */
const maxQuickViewHeight = 556

interface IPullRequestQuickViewProps {
  readonly dispatcher: Dispatcher
  readonly pullRequest: PullRequest

  readonly pullRequestItemTop: number

  /** When mouse leaves the PR quick view */
  readonly onMouseLeave: () => void
}

interface IPullRequestQuickViewState {
  readonly position: React.CSSProperties | undefined
}

export class PullRequestQuickView extends React.Component<
  IPullRequestQuickViewProps,
  IPullRequestQuickViewState
> {
  private quickViewRef: HTMLDivElement | null = null
  private baseHref = 'https://github.com/'

  public constructor(props: IPullRequestQuickViewProps) {
    super(props)

    this.state = {
      position: this.calculatePosition(
        props.pullRequestItemTop,
        this.quickViewHeight
      ),
    }
  }

  public componentDidUpdate = (prevProps: IPullRequestQuickViewProps) => {
    if (
      prevProps.pullRequest.pullRequestNumber ===
        this.props.pullRequest.pullRequestNumber ||
      this.quickViewRef === null
    ) {
      return
    }

    this.setState({
      position: this.calculatePosition(
        this.props.pullRequestItemTop,
        this.quickViewHeight
      ),
    })
  }

  private get quickViewHeight(): number {
    return this.quickViewRef?.clientHeight ?? maxQuickViewHeight
  }

  /**
   * Important to retrieve as it changes for maximization on macOS and quick
   * view is relative to the top of branch container = foldout-container. But if
   * we can't find it (unlikely) we can atleast compensate for the toolbar being
   * 50px
   */
  private getTopPRList(): number {
    return (
      document.getElementById('foldout-container')?.getBoundingClientRect()
        .top ?? 50
    )
  }

  private calculatePosition(
    prListItemTop: number,
    quickViewHeight: number
  ): React.CSSProperties | undefined {
    const topOfPRList = this.getTopPRList()
    // This is currently staticly defined so not bothering to attain it from
    // dom searching.
    const heightPRListItem = 47

    // We want to make sure that the quick view is always visible and highest
    // being aligned to top of branch/pr dropdown (which is 0 since this is a
    // child element of the branch dropdown)
    const minTop = 0
    const maxTop = window.innerHeight - topOfPRList - quickViewHeight

    // Check if it has room to display aligned to top (likely top half of list)
    if (window.innerHeight - prListItemTop > quickViewHeight) {
      const alignedTop = prListItemTop - topOfPRList
      return { top: clamp(alignedTop, minTop, maxTop) }
    }

    // Can't align to top -> likely bottom half of list check if has room to display aligned to bottom.
    if (prListItemTop - quickViewHeight > 0) {
      const alignedTop = prListItemTop - topOfPRList
      const alignedBottom = alignedTop - quickViewHeight + heightPRListItem
      return { top: clamp(alignedBottom, minTop, maxTop) }
    }

    // If not enough room to display aligned top or bottom, attempt to center on
    // list item. For short height screens with max height quick views, this
    // will likely end up being clamped so will be anchored to top or bottom
    // depending on position in list.
    const middlePrListItem = prListItemTop + heightPRListItem / 2
    const middleQuickView = quickViewHeight / 2
    const alignedMiddle = middlePrListItem - middleQuickView
    return { top: clamp(alignedMiddle, minTop, maxTop) }
  }

  private getPointerPosition(
    position: React.CSSProperties | undefined,
    quickViewHeight: number
  ): React.CSSProperties | undefined {
    // 23 = half a pr list item.
    const defaultTop = { top: 20 }
    if (position === undefined) {
      return defaultTop
    }

    const { top, bottom } = position
    const quickViewTopZero = this.getTopPRList()
    const prListItemTopWRTQuickViewTopZero =
      this.props.pullRequestItemTop - quickViewTopZero

    let quickViewTop
    if (top !== undefined) {
      quickViewTop = parseInt(top.toString())
    } else if (bottom !== undefined) {
      const bottomAsNum = parseInt(bottom.toString())
      quickViewTop = bottomAsNum - quickViewHeight + quickViewTopZero
    }

    if (quickViewTop === undefined) {
      return defaultTop
    }

    const prListItemPositionWRToQuickViewTop =
      prListItemTopWRTQuickViewTopZero - quickViewTop
    const centerPointOnListItem =
      prListItemPositionWRToQuickViewTop + defaultTop.top
    return { top: centerPointOnListItem }
  }

  private onQuickViewRef = (quickViewRef: HTMLDivElement) => {
    this.quickViewRef = quickViewRef
  }

  private renderHeader = (): JSX.Element => {
    return (
      <header className="header">
        <Octicon symbol={OcticonSymbol.listUnordered} />
        <div className="action-needed">Review requested</div>
        <Button className="button-with-icon">
          View on GitHub
          <Octicon symbol={OcticonSymbol.linkExternal} />
        </Button>
      </header>
    )
  }

  private renderPR = (): JSX.Element => {
    const { title, pullRequestNumber, base, body } = this.props.pullRequest
    const displayBody =
      body !== undefined && body !== null && body.trim() !== ''
        ? body
        : '_No description provided._'
    return (
      <div className="pull-request">
        <div className="status">
          <Octicon className="icon" symbol={OcticonSymbol.gitPullRequest} />
          <span className="state">Open</span>
        </div>
        <div className="title">
          <h2>{title}</h2>
          <PullRequestBadge
            number={pullRequestNumber}
            dispatcher={this.props.dispatcher}
            repository={base.gitHubRepository}
          />
        </div>
        <SandboxedMarkdown markdown={displayBody} baseHref={this.baseHref} />
      </div>
    )
  }

  private onMouseLeave = () => {
    this.props.onMouseLeave()
  }

  public render() {
    return (
      <div
        id="pull-request-quick-view"
        onMouseLeave={this.onMouseLeave}
        style={this.state.position}
        ref={this.onQuickViewRef}
      >
        <div className="pull-request-quick-view-contents">
          {this.renderHeader()}
          {this.renderPR()}
        </div>
        <div
          className="pull-request-pointer"
          style={this.getPointerPosition(
            this.state.position,
            this.quickViewHeight
          )}
        >
          <span></span>
          <span></span>
        </div>
      </div>
    )
  }
}