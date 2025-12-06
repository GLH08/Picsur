import { Component } from '@angular/core';
import { InfoService } from '../../../services/api/info.service';
import { ClipboardService } from '../../../util/clipboard.service';
import { ErrorService } from '../../../util/error-manager/error.service';

@Component({
  templateUrl: './settings-api-docs.component.html',
  styleUrls: ['./settings-api-docs.component.scss'],
})
export class SettingsApiDocsComponent {
  public apiBaseUrl = '';

  constructor(
    private readonly infoService: InfoService,
    private readonly clipboard: ClipboardService,
    private readonly errorService: ErrorService,
  ) {
    this.apiBaseUrl = this.infoService.getHostname();
  }

  async copyToClipboard(text: string) {
    const result = await this.clipboard.copy(text);
    if (result) {
      this.errorService.success('已复制到剪贴板');
    } else {
      this.errorService.info('复制失败');
    }
  }

  async copyCurlExample() {
    const example = `curl -X POST "${this.apiBaseUrl}/api/image/upload" \\
  -H "Authorization: Api-Key YOUR_API_KEY" \\
  -F "image=@/path/to/image.png"`;
    await this.copyToClipboard(example);
  }

  async copyPythonExample() {
    const example = `import requests

url = "${this.apiBaseUrl}/api/image/upload"
headers = {"Authorization": "Api-Key YOUR_API_KEY"}
files = {"image": open("image.png", "rb")}

response = requests.post(url, headers=headers, files=files)
print(response.json())`;
    await this.copyToClipboard(example);
  }

  async copyJsExample() {
    const example = `const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('${this.apiBaseUrl}/api/image/upload', {
  method: 'POST',
  headers: {'Authorization': 'Api-Key YOUR_API_KEY'},
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));`;
    await this.copyToClipboard(example);
  }
}
