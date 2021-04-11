---
aliases: [YAML, YAML frontmatter]
title: YAML
color: blue
image: files/img.png
---

YAML frontmatter styling is used to selectively style individual nodes. A cool application is to assign images to nodes! 
The following properties are supported out of the box, but you can use any property you like (read on!). 
- `title`: Change the displayed label oon a node. Works very well with Zettlkasten workflows
- `color`: Change the color of a node. For example, you can do hexidecimals like `color: '#123456'` or with color names: `color: blue`.
- `shape`: Change the shape of a node. You can use the same shapes as in the [[Style Pane]].
- `width` and `height`: Change the width and height of a node.
- `image`: Use the given image as a background image on the node. You can use both external links (https) to a website image, or an image in your vault. Some caveats: External images can only be used if the site is configured to accept cross-reference requests! This means it won't work for the majority of external links. 
- `cssclass`: Can be used to assign [[CSS Styling#Classes|classes]]  to the notes for [[CSS Styling]].
A better option is to download the image and save it to your vault. To reference an image in your vault, you need to use the **path to the image**, not just the name of the image. For instance, if your image `img.png` is in the `files` folder, you should do  `image: files/img.png`.
- `cssclass`: List of [[CSS Styling|CSS]] classes that can be used for additional styling of nodes.

## Using other YAML properties
If you have been using other YAML properties that you would like to map to some styling option, that's possible! You will need to use some [[CSS Styling|CSS]] though. 

Here is how some of the given properties above are implemented in CSS: 

```css
node[title] {
  label: data(title);
}

node[shape] {
  shape: data(shape);
}

node[image] {
  background-image: data(image);
}
```

Something similar can be done for any YAML property! Select nodes that have the property using `node[property_name]`, then assign the styling attribute using `attribute: data(property_name)`. 

If you have been using categories, like the genre of an album, you can use the following CSS:

```css
node[genre = 'drama'] {
  background-color: black;
}
```

More ways to filter data are found in the [Cytoscape.js documentation](https://js.cytoscape.org/#selectors/data).

--- 
#feature
- author [[Emile van Krieken]]
- hasTopic [[Styling]]