import React, { FC, useState, useEffect, ChangeEvent, useRef } from "react";
import Axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Button, { ButtonType } from "../Button/button";
import UploadList from './UploadList'
import Dragger from './Dragger'

export type UploadFileStatus = "ready" | "uploading" | "success" | "error";
export interface UploadFile {
  uid: string;
  size: number;
  status?: UploadFileStatus;
  percent?: number;
  raw?: File;
  response?: any;
  error?: any;
  name: string;
}
export interface UploadProps {
  action: string;
  defaultFileList?: UploadFile[];
  beforeUpload?: (file: File) => boolean | Promise<File>;
  onProgress?: (percentage: number, file: File) => void;
  onSuccess?: (data: any, file: File) => void;
  onError?: (err: any, file: File) => void;
  onChange?: (file: File) => void;
  onRemove?: (file: UploadFile) => void;
  headers?: {[key: string] : any};
  name?: string;
  data?: {[key: string]: any};
  accept?: string;
  multiple?: boolean;
  drag?: boolean;
}

const Upload: FC<UploadProps> = (props) => {
  const {
    action,
    defaultFileList,
    beforeUpload,
    onProgress,
    onSuccess,
    onError,
    onChange,
    onRemove,
    name,
    headers,
    data,
    accept,
    multiple,
    drag,
    children
  } = props;
  const [fileList, setFileList] = useState<UploadFile[]>(defaultFileList || []);
  const fileInput = useRef<HTMLInputElement>(null);
  const updateFileList = (
    updateFile: UploadFile,
    updateObj: Partial<UploadFile>
  ) => {
    setFileList((prevList) => {
      return prevList.map((file) => {
        if (file.uid === updateFile.uid) {
          return { ...file, ...updateObj };
        } else {
          return file;
        }
      });
    });
  };
  const post = (file: File) => {
    let _file: UploadFile = {
      uid: uuidv4().replace(/-/g, ""),
      status: "ready",
      name: file.name,
      size: file.size,
      percent: 0,
      raw: file,
    };
    setFileList((prevList) => {
      console.log("prevList=", prevList);
      return [_file, ...prevList];
    });
    const formData = new FormData();
    // formData.append(file.name, file);
    formData.append(name || 'file', file)
    if(data){
      Object.keys(data).forEach(key => {
        formData.append(key, data[key])
      })
    }
    Axios.post(action, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (e) => {
        console.log("e=====", e);
        let percentage = Math.round((e.loaded * 100) / e.total) || 0;
        if (percentage < 100) {
          updateFileList(_file, { percent: percentage, status: "uploading" });
          if (onProgress) {
            onProgress(percentage, file);
          }
        }
      },
    })
      .then((res) => {
        updateFileList(_file, { status: "success", response: res.data });
        setFileList(prevList => {
          console.log("sucess prevList=", prevList);
          return [...prevList]
        });
        if (onSuccess) {
          onSuccess(res, file);
        }
        if (onChange) {
          onChange(file);
        }
      })
      .catch((err) => {
        if (onError) {
          onError(err, file);
        }
        if (onChange) {
          onChange(file);
        }
      });
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      return;
    }
    uploadFiles(files);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };
  const uploadFiles = (files: FileList) => {
    const postFiles = Array.from(files);
    postFiles.forEach((file) => {
      if (!beforeUpload) {
        post(file);
      } else {
        const result = beforeUpload(file);
        if (result && result instanceof Promise) {
          result.then((processedFile) => post(processedFile));
        } else if (result !== false) {
          post(file);
        }
      }
    });
  };
  const handleClick = () => {
    if (fileInput.current) {
      fileInput.current.click();
    }
  };
  const handleRemove = (file: UploadFile) => {
    console.log('remove file=', file)
    setFileList((prevList) => prevList.filter(item => item.uid !== file.uid))
    if(onRemove){
      onRemove(file)
    }
  }
  return (
    <>
      <div>
        {/* <Button btnType={ButtonType.Primary} onClick={handleClick}>
          Upload
        </Button> */}
        <div className="turnip-file-input"
        style={{display: 'inline-block'}}
        onClick={handleClick}
        >
          {
            drag ? <Dragger
             onFile={files => uploadFiles(files)}>
              {children}
            </Dragger> : children
          }
        </div>
        <input
          className="turnip-file-input"
          ref={fileInput}
          style={{ display: "none" }}
          type="file"
          name="myFile"
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
        />
      </div>
      <UploadList
      fileList={fileList}
      onRemove={handleRemove}
      />
    </>
  );
};

Upload.defaultProps = {
  action: "",
  name: 'file'
};

export default Upload;
