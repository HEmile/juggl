---
aliases: []
---

## Introduction
Semantic Obsidian is a long-term project to think of and develop plugins inspired by [[Semantic Markdown]], [[Property Graphs]] and [[Semantic Desktop]]s. 

The goal is to create from Obsidian a [[Personal Knowledge Management]] system that is traversed mainly from graphs in [[Juggl]]. This requires very strong and interactable graph visualization. It also requires a data-format that can easily be queried and extended, and can model linear, non-linear and hierarchical relations between files and notes.

In Semantic Obsidian, notes are the main entities. They have both loose associations through inline wikilinks and backlinks, and strong links through [[Link Types]] with properties. They can be used to provide cues for files that are related. 

This gives the following requirements for the Graph View Plugin:
- A clear and interactable graph view
	- Save and load graphs
	- Style the graphs
- A text-first data format 
	- Data format should easily be extended and converted to other formats
	- Data format should be local
	- Data format should be optional
		- Users should be free to choose to formalize data to any degree
		- Advanced use should not be in view if not needed.
- Annotate links with [[Link Types]] and properties
- Easily extendable through an [[Juggl API|API]]

--- 
#topic #project
- hasTopic [[Obsidian]]
- author [[Emile van Krieken]]