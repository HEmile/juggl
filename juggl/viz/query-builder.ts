import type {NodeCollection} from 'cytoscape';
import searchQuery, {ISearchParserDictionary} from 'search-query-parser';
import cytoscape from 'cytoscape';


const _containsSelector = function(attribute: string, filters: string|string[], op='*='): string[] {
  if (typeof(filters) === 'string' || filters instanceof String) {
    return [`[${attribute} ${op} '${filters}']`];
  }
  return filters.map((s) => `[${attribute} ${op} '${s}']`);
};

const _tagSelector = function(tag: string|string[]): string[] {
  if (typeof(tag) === 'string' || tag instanceof String) {
    if (tag.length > 0 && tag[0] === '#') {
      return [`.tag-${tag.slice(1)}`];
    }
    return [];
  }
  return tag.map((t) => {
    if (t.length > 0 && t[0] === '#') {
      return `.tag-${t.slice(1)}`;
    }
    return '';
  });
};

const _classSelector = function(clazz: string|string[]): string[] {
  if (typeof(clazz) === 'string' || clazz instanceof String) {
    return [`.${clazz}`];
  }
  return clazz.map(( c) => `.${c}`);
};


const literal = function(atomicQuery: ISearchParserDictionary, key: string): string[] {
  switch (key) {
    case 'exclude': return [];
    case 'content':
    case 'ignore-case':
    case 'text': return _containsSelector('content', atomicQuery[key], '@*=');
    case 'match-case':
      return _containsSelector('content', atomicQuery[key], '*=');
    case 'file': return _containsSelector('name', atomicQuery[key]);
    case 'name': return _containsSelector('name', atomicQuery[key], '@*=');
    case 'tag': return _tagSelector(atomicQuery[key]);
    case 'class': return _classSelector(atomicQuery[key]);
    case 'raw': return atomicQuery[key];
    default: return _containsSelector(key, atomicQuery[key]);
  }
};


const _parseAtomicQuery = function(query: string, nodes: NodeCollection): NodeCollection {
  const options = {
    keywords: ['file', 'name', 'content', 'tag', 'path', 'raw', 'match-case', 'ignore-case', 'class'],
    tokenize: true,
    offsets: false,
  };
  const parsedQuery = searchQuery.parse(query, options) as ISearchParserDictionary;
  let selector = 'node';
  for (const key of Object.keys(parsedQuery)) {
    selector += literal(parsedQuery, key).join();
  }
  let filteredNodes = nodes.filter(selector);
  if (parsedQuery.exclude) {
    for (const key of Object.keys(parsedQuery.exclude)) {
      for (const query of literal(parsedQuery.exclude, key)) {
        const selector = 'node' + query;
        console.log(selector);
        filteredNodes = filteredNodes.not(selector);
      }
    }
  }
  return filteredNodes;
};

const _parseConjuncts = function(query: string, toFilter: NodeCollection): NodeCollection {
  const conjuncts: string[] = [];
  const negated: boolean[] = [];
  let nesting = 0;
  let startBrace = -1;
  let lastEndBrace = -1;
  for (let i = 0; i < query.length; i++) {
    if (query[i] === '(') {
      if (nesting === 0) {
        startBrace = i;
        const betweenBraces = query.slice(lastEndBrace+1, i > 0 ? (query[i-1] === '-' ? i-1 : i):i);
        if (betweenBraces.trim().length > 0) {
          negated.push(false);
          conjuncts.push(betweenBraces);
        }
      }
      nesting += 1;
    } else if (query[i] === ')') {
      nesting -= 1;
      if (nesting === 0) {
        lastEndBrace = i;
        negated.push(startBrace > 0 ? query[startBrace-1] === '-' : false);
        conjuncts.push(query.slice(startBrace+1, lastEndBrace));
      }
    } else if (i === query.length-1) {
      const betweenBraces = query.slice(lastEndBrace+1);
      if (betweenBraces.trim().length > 0) {
        negated.push(false);
        conjuncts.push(betweenBraces);
      }
    }
  }
  let coll = toFilter;
  for (let i=0; i < conjuncts.length; i++) {
    const recFiltered = _parseDisjuncts(conjuncts[i], coll, query);
    if (negated[i]) {
      coll = coll.difference(recFiltered);
    } else {
      coll = coll.intersection(recFiltered);
    }
  }
  return coll;
};

const _parseDisjuncts = function(query: string, toFilter: NodeCollection, lastDisjunct: string): NodeCollection {
  if (lastDisjunct === query) {
    return _parseAtomicQuery(query, toFilter);
  }
  const disjuncts: string[] = [];
  let lastEnd = 0;
  let nesting = 0;
  for (let i = 0; i < query.length; i++) {
    if (query[i] === '(') {
      nesting += 1;
    } else if (query[i] === ')') {
      nesting -= 1;
    } else if (nesting === 0 && query[i] === 'O' &&
        i+1 < query.length && query[i+1] === 'R') {
      disjuncts.push(query.slice(lastEnd, i));
      lastEnd = i + 2;
    }
  }
  if (lastEnd < query.length) {
    disjuncts.push(query.slice(lastEnd));
  }
  return disjuncts.reduce((acc, s) =>
  // Performance optimization: Use toFilter - acc to not consider elements that are already matched
    acc.union(_parseConjuncts(s, toFilter.difference(acc))), cytoscape().collection());
};

export const filter = function(query: string, nodes: NodeCollection): NodeCollection {
  return _parseDisjuncts(query, nodes, '');
};
