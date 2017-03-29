/* @flow */

import React from 'react';
import '../styles/index.scss';

import { TreeGraph } from './components/TreeGraph';

class TreeNode extends React.PureComponent {
  render () {
    const { onToggleExpand, label, data } = this.props;
    return (
      <g>
        <circle
          r={10}
          onClick={onToggleExpand}
          style={{
            fill: 'lightsteelblue'
          }} />
        <text x={10} y={-10}>
          {label}
        </text>
        <text x={10} y={10}>
          {data.type}
        </text>
      </g>
    );
  }
}

export default class App extends React.Component {
  render () {
    return (
      <div>
        <TreeGraph
          width={200}
          height={200}
          margin={{
            top: 40,
            left: 40,
            bottom: 40,
            right: 40
          }}
          nodeSize={[150, 60]}
          nodeComponent={TreeNode}
          data={{
            label: 'root',
            expanded: true,
            data: {
              type: 'R'
            },
            children: [
              {
                label: 'c1',
                data: {
                  type: 'C'
                },
                children: [
                  { label: 'gc1', data: {type: 'GC'}, children: [] },
                  { label: 'gc2', data: {type: 'GC'}, children: [] }
                ]
              },
              {
                label: 'c2',
                data: {
                  type: 'C'
                },
                children: [
                  { label: 'gc3', data: {type: 'GC'}, children: [] },
                  { label: 'gc4', data: {type: 'GC'}, children: [] }
                ]
              }
            ]
          }}
        />
      </div>
    );
  }
}
