/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Embeddable, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_FUNCTIONS } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AsyncEmbeddableComponent } from '../async_embeddable_component';
import { EmbeddableFunctionsEmbeddableInput } from './embeddable_functions_factory';
import { EmbeddableFunctionsGrid } from './embeddable_functions_grid';

export class EmbeddableFunctions extends Embeddable<
  EmbeddableFunctionsEmbeddableInput,
  EmbeddableOutput
> {
  readonly type = EMBEDDABLE_FUNCTIONS;
  private _domNode?: HTMLElement;

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    const { data, isLoading, rangeFrom, rangeTo } = this.input;
    const totalSeconds = (rangeTo - rangeFrom) / 1000;
    render(
      <AsyncEmbeddableComponent isLoading={isLoading}>
        <div style={{ width: '100%' }}>
          <EmbeddableFunctionsGrid data={data} totalSeconds={totalSeconds} />
        </div>
      </AsyncEmbeddableComponent>,
      domNode
    );
  }

  public destroy() {
    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }
  }

  reload() {
    if (this._domNode) {
      this.render(this._domNode);
    }
  }
}
