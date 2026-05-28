/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { CustomizationStatus, CustomizationType, type CustomizationAgentRef, type SessionCustomization } from '../../../../../../platform/agentHost/common/state/sessionState.js';
import { getEffectiveAgents } from '../../../../../../platform/agentHost/common/customAgents.js';

function sc(uri: string, agents?: CustomizationAgentRef[], enabled = true): SessionCustomization {
	return {
		type: CustomizationType.Plugin,
		id: uri,
		uri,
		name: uri,
		enabled,
		load: { kind: CustomizationStatus.Loaded },
		...(agents ? { children: agents } : {}),
	};
}

function agent(uri: string, name: string, description?: string): CustomizationAgentRef {
	return { type: CustomizationType.Agent, id: uri, uri, name, ...(description ? { description } : {}) };
}

suite('getEffectiveAgents', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('returns an empty list when no customizations contribute agents', () => {
		assert.deepStrictEqual(getEffectiveAgents(undefined), []);
		assert.deepStrictEqual(getEffectiveAgents([sc('plugin://a'), sc('plugin://b', [])]), []);
	});

	test('treats undefined `agents` as unknown and empty array as no agents', () => {
		const result = getEffectiveAgents([
			sc('plugin://a', [agent('agent://review', 'review')]),
			sc('plugin://b', []),
		]);
		assert.deepStrictEqual(result, [agent('agent://review', 'review')]);
	});

	test('skips disabled session customizations', () => {
		const result = getEffectiveAgents([
			sc('plugin://a', [agent('agent://disabled', 'disabled')], false),
			sc('plugin://b', [agent('agent://enabled', 'enabled')]),
		]);
		assert.deepStrictEqual(result, [agent('agent://enabled', 'enabled')]);
	});

	test('de-dupes by uri (first-seen wins)', () => {
		const result = getEffectiveAgents([
			sc('plugin://a', [
				agent('agent://one', 'one', 'first'),
				agent('agent://two', 'two'),
			]),
			sc('plugin://b', [
				agent('agent://one', 'one', 'duplicate'),
				agent('agent://three', 'three'),
			]),
		]);
		assert.deepStrictEqual(result, [
			agent('agent://one', 'one', 'first'),
			agent('agent://three', 'three'),
			agent('agent://two', 'two'),
		]);
	});

	test('sorts by name, breaking ties by uri', () => {
		const result = getEffectiveAgents([
			sc('plugin://a', [
				agent('agent://z', 'same'),
				agent('agent://x', 'same'),
				agent('agent://y', 'aaa'),
			]),
		]);
		assert.deepStrictEqual(result.map(a => a.uri), ['agent://y', 'agent://x', 'agent://z']);
	});
});
