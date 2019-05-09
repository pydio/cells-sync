/*
 * Copyright (c) 2019. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package config

type Global struct {
	Tasks   []*Task
	changes []chan interface{}
}

type TaskChange struct {
	Type string
	Task *Task
}

type Task struct {
	Uuid           string
	Label          string
	LeftURI        string
	RightURI       string
	Direction      string
	SelectiveRoots []string
}

func (g *Global) Create(t *Task) error {
	g.Tasks = append(g.Tasks, t)
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &TaskChange{Type: "create", Task: t}
			}
		}()
	}
	return e
}

func (g *Global) Remove(task *Task) error {
	var newTasks []*Task
	for _, t := range g.Tasks {
		if t.Uuid != task.Uuid {
			newTasks = append(newTasks, t)
		}
	}
	g.Tasks = newTasks
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &TaskChange{Type: "remove", Task: task}
			}
		}()
	}
	return e
}

func (g *Global) Update(task *Task) error {
	var newTasks []*Task
	for _, t := range g.Tasks {
		if t.Uuid == task.Uuid {
			newTasks = append(newTasks, task)
		} else {
			newTasks = append(newTasks, t)
		}
	}
	g.Tasks = newTasks
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &TaskChange{Type: "update", Task: task}
			}
		}()
	}
	return e
}

func (g *Global) Items() (items []string) {
	for _, t := range g.Tasks {
		dir := "<=>"
		if t.Direction == "Left" {
			dir = "=>"
		} else if t.Direction == "Right" {
			dir = "<="
		}
		items = append(items, t.LeftURI+" "+dir+" "+t.RightURI)
	}
	return
}

var def *Global

func Default() *Global {
	if def == nil {
		if c, e := LoadFromFile(); e == nil {
			def = c
		} else {
			def = &Global{}
		}
	}
	return def
}

func Save() error {
	return WriteToFile(def)
}

func Watch() chan interface{} {
	changes := make(chan interface{})
	def.changes = append(def.changes, changes)
	return changes
}
