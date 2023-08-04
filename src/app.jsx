/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from 'cockpit';
import React from 'react';
import { Card, CardBody, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';

const _ = cockpit.gettext;

export class Application extends React.Component {
  constructor() {
    super();
    this.state = {
      playbookFolder: '/opt/playbooks',
      imageList: [],
    };
  }

  componentDidMount() {
    const populatePlaybookList = () => {
      const playbookDropdown = document.getElementById('playbook');
      const command = `ls ${this.state.playbookFolder} | grep -e .yml -e .yaml`;

      const process = cockpit.spawn(['bash', '-c', command], { superuser: 'require', err: 'message' });

      process.done((data) => {
        const playbooks = data.split('\n');

        playbookDropdown.innerHTML = '';

        playbooks.forEach(function (playbook) {
          if (playbook !== '') {
            const option = document.createElement('option');
            option.value = playbook;
            option.textContent = playbook;
            playbookDropdown.appendChild(option);
          }
        });
      });

      process.fail(function (error) {
        console.error('Error fetching playbooks:', error);
      });
    };

    const populateImageList = () => {
      const command = 'podman image list --filter label=ansible_execution_environment --noheading --format "table {{.Repository}}"';

      const process = cockpit.spawn(['bash', '-c', command], { superuser: 'require', err: 'message' });

      process.done((data) => {
        const images = data.split('\n');

        // Filter out empty strings and set the image list in the state
        this.setState({ imageList: images.filter((image) => image.trim() !== '') });
      });

      process.fail(function (error) {
        console.error('Error fetching images:', error);
      });
    };

    const executePlaybook = (playbook, extraArgs) => {
      const runInContainer = document.getElementById('run-in-container').checked;
      const imageName = document.getElementById('image-name').value;
      const playbookFolder = this.state.playbookFolder;

      let command = '';

      if (runInContainer) {
        command = `podman container runlabel ansible_execution_environment ${imageName} "${playbookFolder}/${playbook} ${extraArgs}"`;
      } else {
        command = `systemd-run --quiet --scope ansible-playbook ${playbookFolder}/${playbook} ${extraArgs}`;
      }

      const outputElement = document.getElementById('output');
      outputElement.innerHTML = '';

      const process = cockpit.spawn(['bash', '-c', command], { superuser: 'require', err: 'message' });

      process.done(function () {
        console.log('Playbook execution complete');
      });

      process.fail(function (error) {
        console.error('Error executing playbook:', error);
        outputElement.textContent += 'Error executing playbook: ' + error;
      });

      process.stream(function (data) {
        outputElement.innerHTML += data;
      });
    };

    document.getElementById('ansible-form').addEventListener('submit', function (event) {
      event.preventDefault();

      const selectedPlaybook = document.getElementById('playbook').value;
      const extraArgs = document.getElementById('extra-args').value;

      if (selectedPlaybook !== '') {
        executePlaybook(selectedPlaybook, extraArgs);
      }
    });

    document.getElementById('load-playbooks-btn').addEventListener('click', () => {
      const newPlaybookFolder = document.getElementById('playbook-folder').value;
      this.setState({ playbookFolder: newPlaybookFolder }, () => {
        populatePlaybookList();
      });
    });

    populatePlaybookList();
    populateImageList();
  }

  render() {
    return (
      <div>
        <Card>
          <CardTitle>Run Ansible Playbook</CardTitle>
          <CardBody>
            <form id="ansible-form">
              <div className="form-group">
                <label htmlFor="playbook-folder">Playbook Folder:</label>
                <input type="text" id="playbook-folder" className="form-control" placeholder="/opt/playbooks" />
              </div>
              <div className="form-group">
                <label htmlFor="playbook">Select Playbook:</label>
                <select id="playbook" className="form-control">
                  <option value="">Choose a playbook</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="extra-args">Extra Arguments:</label>
                <input type="text" id="extra-args" className="form-control" placeholder="Enter extra arguments" />
              </div>
              <div className="form-group">
                <label htmlFor="image-name">Container Image:</label>
                <select id="image-name" className="form-control">
                  {this.state.imageList.map((image, index) => (
                    <option key={index} value={image}>
                      {image}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="run-in-container">Run in Container:</label>
                <input type="checkbox" id="run-in-container" className="form-control" />
              </div>
              <button type="button" className="btn btn-primary" id="load-playbooks-btn">
                Load Playbooks
              </button>
              <button type="submit" className="btn btn-primary">
                Run Playbook
              </button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Output</CardTitle>
          <CardBody>
            <div id="output-container" style={{ height: 'calc(100vh - 400px)', overflow: 'auto' }}>
              <pre id="output"></pre>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
}
