/* @flow */

import React from 'react';
import ReactTransitionGroup from 'react-addons-transition-group';
import { ReactSVGPanZoom } from 'react-svg-pan-zoom';
import * as d3hierarchy from 'd3-hierarchy';
import * as d3interpolate from 'd3-interpolate';
import * as d3ease from 'd3-ease';

import { animate, Animation } from './AnimateProps';

const TRANSITION_DURATION = 200;
const ROOT_ID = 'root';

type TreeStateNode = {
  id: string,
  parentId: string,
  label: string,
  data?: ?any,
  height: number,
  children: string[],
  expanded: boolean,
  active: boolean,
  x: number,
  y: number,
  x0: number,
  y0: number;
}

type TreeConfigNode = {
  label: string,
  data?: ?any,
  children: TreeConfigNode[],
  expanded?: boolean
}

type TreeGraphProps = {
  width: number,
  height: number,
  margin?: {
    top?: number,
    left?: number,
    bottom?: number,
    right?: number
  },
  nodeSize: [number, number],
  nodeComponent?: ?any,
  linkComponent? : ?any,
  data: TreeConfigNode
}

type TreeNodeProps = {
  x: number,
  y: number,
  scale?: number,
  label: string,
  data: any,
  hasChildren: boolean,
  onToggleExpand?: () => any,
  nodeComponent: any
}

type LinkProps = {
  source: {
    x: number,
    y: number
  },
  target: {
    x: number,
    y: number
  },
  linkComponent: any
}

function translate (x, y) {
  return `translate(${x},${y})`;
}

function connectorPath (s, d) {
  const inflect = Math.max(s.x - 30, d.x + 10);
  return `M${d.x + 10},${d.y}H${inflect}V${s.y}H${s.x - 10}`;
}

function transition (initial, target) {
  const interp = d3interpolate.interpolate(initial, target);
  return (t) => interp(d3ease.easeSinInOut(t));
}

class DefaultTreeNode extends React.PureComponent {
  render () {
    const { label, onToggleExpand = () => {} } = this.props;
    return <g>
      <circle
        r={10}
        onClick={onToggleExpand}
        style={{
          fill: 'lightsteelblue'
        }} />
      <text x={10} y={-10}>
        {label}
      </text>
    </g>;
  }
}

class TreeNodeContainer extends React.PureComponent {
  props: TreeNodeProps;

  render () {
    const { x, y, scale, nodeComponent, ...componentProps } = this.props;
    const NodeComponent = nodeComponent;
    return <g transform={`${translate(x, y)} scale(${scale == null ? 1 : scale})`}>
      <NodeComponent {...componentProps} />
    </g>;
  }
}

const AnimatedTreeNodeContainer = animate(
  ({initialX, initialY, x, y}, transitionType) => new Animation()
    .animateProperty('x', {
      duration: TRANSITION_DURATION,
      interpolator: transition(initialX, x)
    })
    .animateProperty('y', {
      duration: TRANSITION_DURATION,
      interpolator: transition(initialY, y)
    })
    .animateProperty('scale', {
      duration: TRANSITION_DURATION,
      interpolator: transitionType === 'enter'
        ? transition(0, 1)
        : transitionType === 'exit'
        ? transition(1, 0)
        : transition(1, 1)
    }),
  (a, b) => {
    return a.initialX === b.initialX &&
      a.initialY === b.initialY &&
      a.x === b.x &&
      a.y === b.y;
  }
)(TreeNodeContainer);

class DefaultLink extends React.Component {
  render () {
    const { source, target } = this.props;
    return <path
      d={connectorPath(source, target)}
      style={{
        fill: 'none',
        stroke: '#ccc',
        strokeWidth: '2px'
      }}
    />;
  }
}

class LinkContainer extends React.Component {
  props: LinkProps;

  render () {
    const { linkComponent, ...componentProps } = this.props;
    const LinkComponent = linkComponent;
    return <LinkComponent {...componentProps} />;
  }
}

const AnimatedLinkContainer = animate(
  ({source, target}) => new Animation()
    .animateProperty('source', {
      duration: TRANSITION_DURATION,
      interpolator: transition({x: source.x0, y: source.y0}, {x: source.x, y: source.y})
    })
    .animateProperty('target', {
      duration: TRANSITION_DURATION,
      interpolator: transition({x: target.x0, y: target.y0}, {x: target.x, y: target.y})
    }),
  (a, b) => {
    return a.source.x0 === b.source.x0 &&
      a.source.y0 === b.source.y0 &&
      a.source.x === b.source.x &&
      a.source.y === b.source.y &&
      a.target.x0 === b.target.x0 &&
      a.target.y0 === b.target.y0 &&
      a.target.x === b.target.x &&
      a.target.y === b.target.y;
  }
)(LinkContainer);

type TreeStructure = {
  [key: string]: TreeStateNode
};

export class TreeGraph extends React.PureComponent {
  props: TreeGraphProps;
  state: {
    treeStructure: TreeStructure,
    size: [number, number]
  };
  svgViewer: ReactSVGPanZoom;

  constructor (props: TreeGraphProps) {
    super(props);
    const treeStructure = this.buildTreeStructure(props.data);
    const size = this.updateLayout(treeStructure);
    this.state = {
      treeStructure,
      size
    };
  }

  buildTreeStructure (treeData: TreeConfigNode) {
    let index = {};
    const configToState = (configNode, id, parentId) => {
      const stateNode = {
        id,
        parentId,
        label: configNode.label,
        data: configNode.data,
        children: configNode.children.map((e, i) => `${id}.${i}`),
        expanded: configNode.expanded != null ? configNode.expanded : false,
        active: false,
        height: 0,
        x: 0,
        y: 0,
        x0: 0,
        y0: 0
      };
      index[id] = stateNode;
      configNode.children.forEach((e, i) => configToState(e, `${id}.${i}`, id));
    };

    configToState(treeData, ROOT_ID, ROOT_ID);
    index[ROOT_ID].active = true;
    return index;
  }

  updateLayout (treeStructure: TreeStructure) {
    const hierarchy = d3hierarchy.hierarchy(treeStructure[ROOT_ID], e => e.expanded ? e.children.map(id => treeStructure[id]) : []);
    const { nodeSize } = this.props;
    const treeLayout = d3hierarchy.tree().nodeSize([nodeSize[1], nodeSize[0]]);
    const treeData = treeLayout(hierarchy);

    const [minX, minY, maxX, maxY] = treeData.descendants().reduce((a, e) => {
      const [minX, minY, maxX, maxY] = a;
      return [Math.min(e.x, minX), Math.min(e.y, minY), Math.max(e.x, maxX), Math.max(e.y, maxY)];
    }, [0, 0, 0, 0]);
    const size = [maxY - minY + nodeSize[0], maxX - minX + nodeSize[1]];
    const xOffset = 0;
    const yOffset = (size[1] / 2) - ((maxX + minX) / 2);

    const layoutIndex = {};
    treeData.descendants().forEach(e => {
      layoutIndex[e.data.id] = e;
    });

    const findFirstActiveParent = id => {
      while (!(id in layoutIndex)) {
        id = treeStructure[id].parentId;
      }

      return treeStructure[id];
    };

    const updateTreeStructure = (id) => {
      const e = treeStructure[id];
      const wasActive = e.active;
      const isActive = e.id in layoutIndex;

      if (wasActive && !isActive) {
        const activeParent = findFirstActiveParent(e.parentId);
        treeStructure[e.id] = {
          ...e,
          active: false,
          x0: e.x,
          y0: e.y,
          x: activeParent.x,
          y: activeParent.y
        };
      } else if (!wasActive && isActive) {
        const activeParent = findFirstActiveParent(e.parentId);
        treeStructure[e.id] = {
          ...e,
          active: true,
          x0: activeParent.x0,
          y0: activeParent.y0,
          x: layoutIndex[e.id].y + xOffset,
          y: layoutIndex[e.id].x + yOffset,
          height: layoutIndex[e.id].height
        };
      } else if (isActive) {
        treeStructure[e.id] = {
          ...e,
          x0: e.x,
          y0: e.y,
          x: layoutIndex[e.id].y + xOffset,
          y: layoutIndex[e.id].x + yOffset,
          height: layoutIndex[e.id].height
        };
      }
    };

    treeData.descendants().forEach(e => {
      updateTreeStructure(e.data.id);
    });

    Object.keys(treeStructure).filter(id => !(id in layoutIndex)).forEach(id => {
      updateTreeStructure(id);
    });

    return size;
  }

  handleToggleExpand (id: string) {
    const { treeStructure } = this.state;
    const newTreeStructure = {
      ...treeStructure,
      [id]: {
        ...treeStructure[id],
        expanded: !treeStructure[id].expanded
      }
    };
    const size = this.updateLayout(newTreeStructure);
    this.setState({treeStructure: newTreeStructure, size});
    /*
    setTimeout(() => {
      const svgViewerState = this.svgViewer.getValue();
      this.svgViewer.setPointOnViewerCenter(newTreeStructure[id].x, newTreeStructure[id].y, svgViewerState.a);
    }, TRANSITION_DURATION);
    */
  }

  componentWillReceiveProps (nextProps: TreeGraphProps) {
    if (nextProps.data !== this.props.data) {
      const treeStructure = this.buildTreeStructure(nextProps.data);
      const size = this.updateLayout(treeStructure);
      this.setState({
        treeStructure,
        size
      });
    }
  }

  render () {
    const {
      width,
      height,
      margin = {},
      nodeComponent = DefaultTreeNode,
      linkComponent = DefaultLink
    } = this.props;
    const { treeStructure, size } = this.state;
    const nodes = Object.keys(treeStructure).map(k => treeStructure[k]).filter(e => e.active);
    const links = nodes.filter(e => e.id !== ROOT_ID);

    const xPad = (margin.left || 0) + (margin.right || 0);
    const yPad = (margin.top || 0) + (margin.bottom || 0);
    const viewerWidth = width + xPad;
    const viewerHeight = height + yPad;
    const [ svgWidth, svgHeight ] = size;
    return (
      <ReactSVGPanZoom
        width={viewerWidth} height={viewerHeight}
        tool='auto' toolbarPosition='none'
        preventPanOutside
        background='white'
        ref={(viewer) => { this.svgViewer = viewer; }}>
        <svg width={svgWidth + xPad} height={svgHeight + yPad}>
          <g transform={translate(margin.left || 0, margin.top || 0)}>
            <ReactTransitionGroup component='g' childFactory={child => {
              const link = treeStructure[child.props.id];
              return <AnimatedLinkContainer
                key={link.id}
                source={link}
                target={treeStructure[link.parentId]}
                linkComponent={linkComponent}
              />;
            }}>
              {links.map(link => <div id={link.id} key={link.id} />)}
            </ReactTransitionGroup>
            <ReactTransitionGroup component='g' childFactory={child => {
              const node = treeStructure[child.props.id];
              return <AnimatedTreeNodeContainer
                key={node.id}
                onToggleExpand={() => this.handleToggleExpand(node.id)}
                initialX={node.x0}
                initialY={node.y0}
                x={node.x}
                y={node.y}
                label={node.label}
                data={node.data}
                hasChildren={node.children.length}
                nodeComponent={nodeComponent}
              />;
            }}>
              {nodes.map(node => <div id={node.id} key={node.id} />)}
            </ReactTransitionGroup>
          </g>
        </svg>
      </ReactSVGPanZoom>
    );
  }
}
