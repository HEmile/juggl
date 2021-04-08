---
aliases: []
---
You can created Typed Links using the following syntax:
`- linkType [[note 1]], [[note 2|alias]]`

This vault contains many examples of such links at the bottom of the page. These will be visualized by [[Juggl]] as text on edges.

## Development
This syntax has multiple issues:
1. It is metadata, and not inline. Most of the links people write in Obsidian are 'inline': They are part of the text, instead of seperate lines.
2. This syntax doesn't allow adding properties. For example, the relation `publishedIn` could have useful additional metadata, such as the year it was published. Similarly, when creating a list of ingredients, it'd be useful to also register the quantity needed for each ingredient.
3. You can only link the current note as a source. However, if, for example, you are writing a daily note, you might write that "Today, Joe Biden becomes the president of the US". The correspond	ing link should be \[Joe Biden\] -President->\[US\]. Otherwise, one would have to write this in a new "Joe Biden" note, even if this doesn't necessarily make sense while writing.	

To solve these issues we will work on a new, more general syntax. Currently, the idea is the following: `This recipe requires 20 grams of [[Rice|rice|ingredient|quantity=20 grams]]`. This is an inline syntax of the form `[[Note name|alias|linkType|property1=value1|property2=value]]`. However, this does not yet solve issue 3!

A similar idea which is used in [Semantic Mediawiki](https://www.semantic-mediawiki.org/wiki/Semantic_MediaWiki) and which is going to be used in [Keypoints](keypoints.app), is `This recipe requires 20 grams of [[quantity=20 grams::ingredient::Rice|rice]]`. This puts the link type in the beginning, which can be more natural to read. It also helps standardize this syntax.  

Input for this syntax and ease of use is highly appreciated. We welcome you to join the discussion at [[Discord]]. 


--- 
#topic
- subset [[Semantic Obsidian]] 
- author [[Emile van Krieken]]